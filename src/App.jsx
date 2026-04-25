import { useState, useEffect, useRef } from 'react'
import { Upload, Book, Settings, Moon, Sun, Palette, ChevronLeft, ChevronRight, X, Trash2, Plus, Star, Clock, FileText } from 'lucide-react'
import localforage from 'localforage'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import ePub from 'epubjs'

// Configure PDF.js worker with a bundled asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function App() {
  const [books, setBooks] = useState([])
  const [currentBook, setCurrentBook] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [numPages, setNumPages] = useState(null)
  const [bookPages, setBookPages] = useState([])
  const [bookSections, setBookSections] = useState([])
  const [theme, setTheme] = useState('light')
  const [fontSize, setFontSize] = useState(18)
  const [view, setView] = useState('library') // 'library' or 'reader'
  const [isLoading, setIsLoading] = useState(false)
  const [pdfDocument, setPdfDocument] = useState(null)
  const [isRendering, setIsRendering] = useState(false)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load books and settings on mount
  useEffect(() => {
    loadBooks()
    loadSettings()
  }, [])

  // Save progress when page changes
  useEffect(() => {
    if (currentBook && currentPage > 1) {
      saveProgress(currentBook.id, currentPage)
    }
  }, [currentPage, currentBook])

  // Rebuild app pages whenever text structure or font size changes
  useEffect(() => {
    if (!currentBook || !bookSections.length) return

    const pages = paginateSections(bookSections, fontSize)
    setBookPages(pages)
    setNumPages(pages.length)
    setCurrentPage(prev => Math.min(prev, pages.length || 1))
  }, [bookSections, fontSize, currentBook])

  const loadBooks = async () => {
    try {
      const savedBooks = await localforage.getItem('books') || []
      setBooks(savedBooks)
    } catch (error) {
      console.error('Error loading books:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const savedTheme = await localforage.getItem('theme') || 'light'
      const savedFontSize = await localforage.getItem('fontSize') || 18
      setTheme(savedTheme)
      setFontSize(savedFontSize)
      document.documentElement.className = savedTheme
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveProgress = async (bookId, page) => {
    try {
      const progress = await localforage.getItem('progress') || {}
      progress[bookId] = page
      await localforage.setItem('progress', progress)
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  const loadProgress = async (bookId) => {
    try {
      const progress = await localforage.getItem('progress') || {}
      return progress[bookId] || 1
    } catch (error) {
      console.error('Error loading progress:', error)
      return 1
    }
  }

  const decodeBookData = (fileData) => {
    if (!fileData) return null

    if (fileData instanceof ArrayBuffer) {
      return fileData
    }

    if (fileData instanceof Uint8Array) {
      return fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength)
    }

    if (typeof fileData === 'string') {
      const base64 = fileData.startsWith('data:') ? fileData.split(',')[1] : fileData
      try {
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
      } catch (decodeError) {
        console.error('Error decoding base64 book data:', decodeError)
        return null
      }
    }

    if (Array.isArray(fileData)) {
      return new Uint8Array(fileData).buffer
    }

    if (fileData.data && Array.isArray(fileData.data)) {
      return new Uint8Array(fileData.data).buffer
    }

    if (fileData.buffer && fileData.byteLength) {
      try {
        return new Uint8Array(fileData.buffer).buffer
      } catch {
        return null
      }
    }

    return null
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const extension = file.name.split('.').pop().toLowerCase()
    const type = extension === 'epub' ? 'epub' : extension === 'pdf' ? 'pdf' : null
    if (!type) {
      alert('Please select a PDF or EPUB file')
      return
    }

    setIsLoading(true)
    try {
      console.log('Uploading file:', file.name, 'Size:', file.size)

      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const book = {
        id: Date.now().toString(),
        name: file.name.replace(/\.(pdf|epub)$/i, ''),
        fileData: base64Data,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        type
      }

      const updatedBooks = [...books, book]
      setBooks(updatedBooks)
      await localforage.setItem('books', updatedBooks)
      console.log('Book saved to localForage')
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file: ' + error.message)
    } finally {
      setIsLoading(false)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const deleteBook = async (bookId) => {
    if (!confirm('Are you sure you want to delete this book?')) return

    try {
      const updatedBooks = books.filter(book => book.id !== bookId)
      setBooks(updatedBooks)
      await localforage.setItem('books', updatedBooks)

      // Also remove progress
      const progress = await localforage.getItem('progress') || {}
      delete progress[bookId]
      await localforage.setItem('progress', progress)
    } catch (error) {
      console.error('Error deleting book:', error)
      alert('Error deleting book')
    }
  }

  const openBook = async (book) => {
    try {
      console.log('Opening book:', book.name)
      setCurrentBook(book)
      setView('reader')
      setIsRendering(true)
      setBookPages([])
      setBookSections([])
      setCurrentPage(1)

      const fileData = decodeBookData(book.fileData)
      if (!fileData) {
        throw new Error('Unable to read stored book data. Please re-upload the file.')
      }

      let sections = []

      if (book.type === 'epub') {
        sections = await extractEpubBookSections(fileData)
      } else {
        const loadingTask = pdfjsLib.getDocument({ data: fileData })
        const pdf = await loadingTask.promise
        setPdfDocument(pdf)
        console.log('PDF loaded, pages:', pdf.numPages)
        sections = await extractPdfBookSections(pdf)
      }

      setBookSections(sections)
      const pages = paginateSections(sections, fontSize)
      setBookPages(pages)
      setNumPages(pages.length)

      const savedPage = await loadProgress(book.id)
      setCurrentPage(Math.min(savedPage, pages.length || 1))
      setIsRendering(false)
    } catch (error) {
      console.error('Error opening book:', error)
      alert('Error opening book: ' + error.message)
      setIsRendering(false)
      setView('library')
    }
  }

  const closeBook = () => {
    if (pdfDocument) {
      pdfDocument.destroy()
      setPdfDocument(null)
    }
    setCurrentBook(null)
    setCurrentPage(1)
    setNumPages(null)
    setView('library')
  }

  const changeTheme = async (newTheme) => {
    setTheme(newTheme)
    document.documentElement.className = newTheme
    await localforage.setItem('theme', newTheme)
  }

  const saveFontSize = async (newSize) => {
    setFontSize(newSize)
    await localforage.setItem('fontSize', newSize)
  }

  const buildSectionsFromContent = (textContent) => {
    if (!textContent.items || textContent.items.length === 0) {
      return []
    }

    // Sort items by their vertical position (top to bottom)
    const sortedItems = textContent.items.slice().sort((a, b) => {
      const [, , , , , y1] = a.transform
      const [, , , , , y2] = b.transform
      return y2 - y1 // Higher Y values come first (PDF coordinate system)
    })

    // Analyze font sizes to detect headers
    const fontSizes = sortedItems
      .map(item => item.height || item.width)
      .filter(Boolean)
    const avgFontSize = fontSizes.length ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length : 12
    const headerThreshold = avgFontSize * 1.25

    // Group items into lines based on vertical proximity
    const lines = []
    let currentLine = []
    let lastY = null
    const lineTolerance = 8

    sortedItems.forEach((item) => {
      const [, , , , x, y] = item.transform

      if (lastY === null || Math.abs(y - lastY) > lineTolerance) {
        if (currentLine.length > 0) {
          lines.push(currentLine)
        }
        currentLine = [{ x, item }]
        lastY = y
      } else {
        currentLine.push({ x, item })
        lastY = Math.max(lastY, y)
      }
    })

    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    const processedLines = lines.map(line => {
      const sortedLine = line.sort((a, b) => a.x - b.x)
      const avgSize = sortedLine.reduce((sum, item) => sum + (item.item.height || avgFontSize), 0) / sortedLine.length
      const text = sortedLine.map(({ item }) => item.str).join('').trim()
      const isHeader = avgSize > headerThreshold || text.match(/^(chapter|chapter\s+\d+|part\s+\d+)/i)
      return { text, isHeader, fontSize: avgSize }
    }).filter(line => line.text.length > 0)

    const sections = []
    let currentParagraph = []

    processedLines.forEach((line, index) => {
      if (line.isHeader) {
        if (currentParagraph.length > 0) {
          sections.push({
            type: 'paragraph',
            content: currentParagraph.join(' ').replace(/\s+/g, ' ').trim()
          })
          currentParagraph = []
        }
        sections.push({
          type: 'header',
          content: line.text,
          level: line.fontSize > avgFontSize * 1.4 ? 'h1' : 'h2'
        })
      } else {
        currentParagraph.push(line.text)
        const nextLine = processedLines[index + 1]
        const isHeaderNext = nextLine?.isHeader
        const endsSentence = /[.!?]$/.test(line.text)

        if (!nextLine || isHeaderNext || endsSentence) {
          sections.push({
            type: 'paragraph',
            content: currentParagraph.join(' ').replace(/\s+/g, ' ').trim()
          })
          currentParagraph = []
        }
      }
    })

    if (currentParagraph.length > 0) {
      sections.push({
        type: 'paragraph',
        content: currentParagraph.join(' ').replace(/\s+/g, ' ').trim()
      })
    }

    return sections.filter(s => s.content && s.content.trim().length > 0)
  }

  const splitParagraphSections = (section, maxChars) => {
    if (section.type !== 'paragraph' || section.content.length <= maxChars * 1.2) {
      return [section]
    }

    const sentences = section.content.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [section.content]
    const splitSections = []
    let currentText = ''

    sentences.forEach(sentence => {
      if ((currentText + sentence).length > maxChars && currentText.length > 0) {
        splitSections.push({ type: 'paragraph', content: currentText.trim() })
        currentText = sentence
      } else {
        currentText += sentence
      }
    })

    if (currentText.trim().length > 0) {
      splitSections.push({ type: 'paragraph', content: currentText.trim() })
    }

    return splitSections
  }

  const paginateSections = (sections, selectedFontSize) => {
    const pageCapacity = Math.max(900, Math.round(1800 * (18 / selectedFontSize)))
    const pages = []
    let currentPageSections = []
    let currentWeight = 0

    sections.forEach((section) => {
      const blocks = section.type === 'paragraph' ? splitParagraphSections(section, pageCapacity) : [section]

      blocks.forEach((block) => {
        const weight = block.type === 'header'
          ? Math.max(90, Math.round(block.content.length * 0.7))
          : block.content.length

        if (currentWeight + weight > pageCapacity && currentPageSections.length > 0) {
          pages.push(currentPageSections)
          currentPageSections = []
          currentWeight = 0
        }

        currentPageSections.push(block)
        currentWeight += weight
      })
    })

    if (currentPageSections.length > 0) {
      pages.push(currentPageSections)
    }

    return pages
  }

  const extractPdfBookSections = async (pdf) => {
    const sections = []
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      sections.push(...buildSectionsFromContent(textContent))
    }
    return sections
  }

  const extractEpubBookSections = async (fileData) => {
    try {
      // Check if epubjs is available and working
      if (!ePub) {
        throw new Error('EPUB library not loaded')
      }

      // Check if we're on Safari (which has issues with epubjs)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      if (isSafari) {
        throw new Error('EPUB files are not supported on Safari. Please use a PDF file or try a different browser.')
      }

      const epubBook = ePub(fileData)
      await epubBook.ready
      const sections = []

      for (const item of epubBook.spine.spineItems) {
        let loaded
        try {
          loaded = await item.load()
        } catch {
          loaded = await item.load(epubBook.load.bind(epubBook))
        }

        const doc = loaded?.document || item.document
        const text = doc?.body?.textContent || ''
        if (text.trim()) {
          const normalized = text.replace(/\s+/g, ' ').trim()
          sections.push({ type: 'paragraph', content: normalized })
        }

        if (item.unload) item.unload()
      }

      return sections.filter(s => s.content && s.content.trim().length > 0)
    } catch (error) {
      console.error('Error extracting EPUB:', error)
      return [{ type: 'paragraph', content: 'EPUB support is not available on this device. Please try a PDF file instead.' }]
    }
  }

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(numPages, prev + 1))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.18),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(71,85,105,0.16),_transparent_24%),linear-gradient(180deg,#0c1118,#1b2430)] text-slate-100'
      case 'sepia':
        return 'bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,#fef3c7,#fff7ed)] text-amber-900'
      default:
        return 'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.14),_transparent_24%),linear-gradient(180deg,#eef2ff,#f8fbff)] text-slate-900'
    }
  }

  const getCardClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:bg-gray-700/50'
      case 'sepia':
        return 'bg-amber-100/80 backdrop-blur-sm border-amber-200/50 hover:bg-amber-200/50'
      default:
        return 'bg-white/80 backdrop-blur-sm border-white/50 hover:bg-blue-50/50'
    }
  }

  if (view === 'reader' && currentBook) {
    return (
      <div className={`min-h-screen ${getThemeClasses()} transition-all duration-500`}>
        {/* Reader Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-white/20 dark:border-slate-700/30 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <button
              onClick={closeBook}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 backdrop-blur-sm transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium shadow-sm hover:shadow-md"
            >
              <ChevronLeft size={18} />
              Library
            </button>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full p-1 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => changeTheme('light')}
                  className={`p-2 rounded-full transition-all duration-200 ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  aria-pressed={theme === 'light'}
                >
                  <Sun size={16} />
                </button>
                <button
                  onClick={() => changeTheme('sepia')}
                  className={`p-2 rounded-full transition-all duration-200 ${theme === 'sepia' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  aria-pressed={theme === 'sepia'}
                >
                  <Palette size={16} />
                </button>
                <button
                  onClick={() => changeTheme('dark')}
                  className={`p-2 rounded-full transition-all duration-200 ${theme === 'dark' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  aria-pressed={theme === 'dark'}
                >
                  <Moon size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-800/60 px-3 py-2 rounded-full backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                  Theme: {theme === 'light' ? 'Light' : theme === 'sepia' ? 'Sepia' : 'Dark'}
                </div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-800/60 px-3 py-2 rounded-full backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                  {currentPage} / {numPages || '?'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reader Content */}
        <div className="flex-1 flex justify-center px-4 py-6">
          <div className="max-w-3xl w-full">
            {isRendering ? (
              <div className="flex items-center justify-center py-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400"></div>
                </div>
                <span className="ml-4 text-slate-700 dark:text-slate-300 text-lg font-medium">Loading page...</span>
              </div>
            ) : (
              <div className="bg-white/95 dark:bg-slate-950/95 rounded-[28px] shadow-2xl dark:shadow-[0_35px_90px_-50px_rgba(15,23,42,0.9)] border border-slate-200/40 dark:border-slate-700/60 overflow-hidden transition-all duration-300">
                {/* Reader Info Section */}
                <div className="px-8 py-6 border-b border-slate-100/50 dark:border-slate-800/60 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900/40 dark:to-slate-950/30">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 font-bold">Currently Reading</div>
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">{currentBook.name}</h1>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
                          <FileText size={14} className="text-blue-500" />
                          Page {currentPage} of {numPages}
                        </span>
                        <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full"></span>
                        <span>{formatFileSize(currentBook.size)}</span>
                      </div>
                    </div>

                    {/* Font Controls */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                      <button
                        onClick={() => saveFontSize(Math.max(14, fontSize - 2))}
                        className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200 font-bold text-sm leading-none active:scale-95"
                        title="Decrease font size"
                      >
                        A−
                      </button>
                      <div className="px-4 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[3.5rem] text-center">
                        {fontSize}
                      </div>
                      <button
                        onClick={() => saveFontSize(Math.min(32, fontSize + 2))}
                        className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200 font-bold text-sm leading-none active:scale-95"
                        title="Increase font size"
                      >
                        A+
                      </button>
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="px-8 py-8 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                  <div
                    className="text-slate-900 dark:text-slate-100 leading-relaxed selection:bg-blue-200 dark:selection:bg-blue-800 selection:text-blue-900 dark:selection:text-blue-100"
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: `${fontSize * 1.6}px`,
                      hyphens: 'auto',
                      wordBreak: 'break-word'
                    }}
                  >
                    {bookPages[currentPage - 1] && bookPages[currentPage - 1].length > 0 ? (
                      <div className="space-y-6">
                        {bookPages[currentPage - 1].map((section, index) => {
                          if (section.type === 'header') {
                            return (
                              <div key={index} className={`mt-8 mb-6 ${index === 0 ? 'mt-0' : ''}`}>
                                <h2 className={`font-bold text-slate-900 dark:text-white leading-tight ${section.level === 'h1' ? 'text-2xl' : 'text-xl'}`}>
                                  {section.content}
                                </h2>
                                <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-3"></div>
                              </div>
                            )
                          }

                          return (
                            <p key={index} className="text-justify indent-8 first:indent-0">
                              {section.content}
                            </p>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <FileText size={24} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">No readable text found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-500 max-w-md">
                          This section may contain images, scanned content, or non-selectable text. Adjust the font size or try another document.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reading Progress Bar */}
                <div className="px-8 py-4 bg-slate-100/80 dark:bg-slate-950/70 border-t border-slate-200/50 dark:border-slate-800/60 backdrop-blur-xl">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-3 font-semibold uppercase tracking-[0.24em]">
                    <span>Progress</span>
                    <span>{Math.round((currentPage / numPages) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300 shadow-lg"
                      style={{ width: `${(currentPage / numPages) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="sticky bottom-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-700/30 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-center gap-4 max-w-7xl mx-auto flex-wrap">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-sm shadow-sm hover:shadow-md disabled:hover:shadow-sm"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/70 rounded-full px-4 py-2.5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 10))}
                disabled={currentPage <= 10}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 disabled:opacity-40"
                title="Previous 10 pages"
              >
                <ChevronLeft size={16} />
                <ChevronLeft size={16} className="-ml-2" />
              </button>

              <input
                type="number"
                min="1"
                max={numPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value)
                  if (page >= 1 && page <= numPages) {
                    setCurrentPage(page)
                  }
                }}
                className="w-16 bg-white dark:bg-slate-900 text-center font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1 text-sm"
              />
              <span className="text-slate-600 dark:text-slate-400 font-semibold text-sm">/ {numPages}</span>

              <button
                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 10))}
                disabled={currentPage >= numPages - 10}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 disabled:opacity-40"
                title="Next 10 pages"
              >
                <ChevronRight size={16} />
                <ChevronRight size={16} className="-ml-2" />
              </button>
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-sm shadow-sm hover:shadow-md disabled:hover:shadow-sm"
            >
              <span>Next</span>
              <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Library View
  return (
    <div className={`min-h-screen ${getThemeClasses()} transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Modern Header */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl rounded-2xl border border-white/30 dark:border-slate-700/50 mb-10 shadow-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Book size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Library</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent leading-tight tracking-tight">
            Your Digital Library
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
            Immerse yourself in beautifully curated reading experiences with intelligent text processing and modern design
          </p>
        </div>

        {/* Premium Stats Bar */}
        <div className="flex justify-center mb-20">
          <div className="inline-flex gap-12 bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl rounded-3xl px-12 py-8 border border-white/40 dark:border-slate-700/60 shadow-2xl shadow-slate-900/20">
            <div className="text-center group">
              <div className="text-6xl font-black text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                {books.length}
              </div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Books</div>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-transparent rounded-full mx-auto mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="w-px bg-slate-400/40 dark:bg-slate-600/40"></div>
            <div className="text-center group">
              <div className="text-6xl font-black text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                {books.reduce((total, book) => total + (book.size || 0), 0) ? formatFileSize(books.reduce((total, book) => total + (book.size || 0), 0)) : '0 B'}
              </div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Storage</div>
              <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-transparent rounded-full mx-auto mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>

        {/* Premium Action Bar */}
        <div className="flex justify-center items-center gap-6 mb-24 flex-wrap">
          {/* Elegant Theme Toggle */}
          <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl rounded-3xl p-2 border border-white/40 dark:border-slate-700/60 shadow-2xl shadow-slate-900/20">
            <button
              onClick={() => changeTheme('light')}
              className={`p-3 rounded-2xl transition-all duration-300 ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl scale-110' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/50'}`}
              title="Light Theme"
              aria-pressed={theme === 'light'}
            >
              <Sun size={20} />
            </button>
            <button
              onClick={() => changeTheme('sepia')}
              className={`p-3 rounded-2xl transition-all duration-300 ${theme === 'sepia' ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300 shadow-xl scale-110' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/50'}`}
              title="Sepia Theme"
              aria-pressed={theme === 'sepia'}
            >
              <Palette size={20} />
            </button>
            <button
              onClick={() => changeTheme('dark')}
              className={`p-3 rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'bg-slate-700 text-white shadow-xl scale-110' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/50'}`}
              title="Dark Theme"
              aria-pressed={theme === 'dark'}
            >
              <Moon size={20} />
            </button>
          </div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-800/60 px-3 py-2 rounded-full border border-slate-200/50 dark:border-slate-700/50">
            Active theme: {theme === 'light' ? 'Light' : theme === 'sepia' ? 'Sepia' : 'Dark'}
          </div>

          {/* Premium Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white text-white dark:text-slate-900 rounded-3xl shadow-2xl shadow-slate-900/30 hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 font-bold text-lg hover:-translate-y-1"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Plus size={24} />
                <span>Add Book</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Premium Empty State */}
        {books.length === 0 ? (
          <div className="text-center py-32">
            <div className="relative mb-12">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl hover:scale-110 transition-transform duration-500">
                <Book size={72} className="text-white" />
              </div>
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center animate-bounce shadow-2xl">
                <Plus size={28} className="text-yellow-900 font-bold" />
              </div>
            </div>
            <h2 className="text-6xl font-black mb-6 text-slate-900 dark:text-white bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
              Start Your Journey
            </h2>
            <p className="text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Upload your first PDF or EPUB and experience the future of intelligent reading with beautiful typography and seamless design
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-4 px-10 py-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white text-white dark:text-slate-900 rounded-3xl shadow-2xl shadow-slate-900/30 hover:shadow-3xl transition-all duration-300 text-xl font-bold hover:scale-105 hover:-translate-y-2"
            >
              <Upload size={28} />
              Upload Your First Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {books.map((book) => (
              <div
                key={book.id}
                className="group relative bg-white/90 dark:bg-slate-950/90 backdrop-blur-3xl rounded-3xl p-8 cursor-pointer hover:bg-white dark:hover:bg-slate-900 border border-white/30 dark:border-slate-700/60 hover:border-blue-300/50 dark:hover:border-blue-500/40 shadow-2xl shadow-slate-900/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.03] overflow-hidden"
              >
                {/* Premium Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteBook(book.id)
                  }}
                  className="absolute top-4 right-4 p-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-2xl shadow-xl border border-red-400/40 transition-all duration-300 hover:scale-110 active:scale-95 md:opacity-0 md:group-hover:opacity-100"
                  title="Delete book"
                >
                  <Trash2 size={18} className="text-white drop-shadow-sm" />
                </button>

                {/* Premium Book Icon */}
                <div className="flex items-center justify-center mb-8">
                  <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <FileText size={40} className="text-white" />
                  </div>
                </div>

                {/* Premium Book Info */}
                <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-white text-center leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {book.name}
                </h3>
                <div className="space-y-3 text-base text-slate-600 dark:text-slate-400 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={16} />
                    <span className="font-medium">{new Date(book.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  {book.size && (
                    <div className="font-bold text-slate-700 dark:text-slate-300 text-lg">
                      {formatFileSize(book.size)}
                    </div>
                  )}
                </div>

                {/* Premium Read Button */}
                <button
                  onClick={() => openBook(book)}
                  className="w-full mt-8 px-6 py-4 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 font-bold text-lg hover:scale-105 active:scale-95 hover:-translate-y-1"
                >
                  Read Now
                </button>

                {/* Premium Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-indigo-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App