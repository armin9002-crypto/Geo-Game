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
  const [showChrome, setShowChrome] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const chromeTimeoutRef = useRef(null)

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

  // Chrome auto-hide handler for reader view
  useEffect(() => {
    if (view !== 'reader') return

    const handleInteraction = () => {
      setShowChrome(true)
      setLastInteraction(Date.now())

      if (chromeTimeoutRef.current) {
        clearTimeout(chromeTimeoutRef.current)
      }

      chromeTimeoutRef.current = setTimeout(() => {
        setShowChrome(false)
      }, 3000)
    }

    document.addEventListener('click', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
      if (chromeTimeoutRef.current) {
        clearTimeout(chromeTimeoutRef.current)
      }
    }
  }, [view])

  // Keyboard shortcuts handler for reader view
  useEffect(() => {
    if (view !== 'reader') return

    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false)
      } else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        goToNextPage()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrevPage()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [view, currentPage, numPages])

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

  // Generate a stable color from book title hash
  const generateColorFromTitle = (title) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-blue-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500',
      'from-teal-500 to-cyan-500'
    ]
    let hash = 0
    for (let i = 0; i < title.length; i++) {
      hash = ((hash << 5) - hash) + title.charCodeAt(i)
      hash = hash & hash
    }
    return colors[Math.abs(hash) % colors.length]
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
    setShowChrome(true)
    setSettingsOpen(false)
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
      <div className={`min-h-screen ${getThemeClasses()} transition-all duration-500 flex flex-col`} onClick={() => setShowChrome(!showChrome)}>
        {/* Minimal Top Bar with Auto-Hide */}
        <div className={`sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-white/20 dark:border-slate-700/30 px-6 py-4 shadow-sm transition-all duration-300 ${showChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeBook()
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 backdrop-blur-sm transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium shadow-sm hover:shadow-md"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Library</span>
            </button>

            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate px-4 flex-1 text-center">
              {currentBook.name.length > 30 ? currentBook.name.substring(0, 27) + '...' : currentBook.name}
            </h2>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setSettingsOpen(!settingsOpen)
              }}
              className="p-2.5 rounded-full bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 backdrop-blur-sm transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm hover:shadow-md"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Settings Panel Overlay */}
        {settingsOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          />
        )}

        {/* Settings Slide-in Panel */}
        <div className={`fixed right-0 top-0 z-50 h-full w-72 bg-white dark:bg-slate-950 shadow-2xl transform transition-transform duration-300 ease-out ${settingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 flex flex-col gap-8 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Theme</label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    changeTheme('light')
                    setShowChrome(true)
                  }}
                  className={`p-3 rounded-xl text-left transition-all ${theme === 'light' ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  <Sun size={18} className="inline mr-2" />
                  Light
                </button>
                <button
                  onClick={() => {
                    changeTheme('sepia')
                    setShowChrome(true)
                  }}
                  className={`p-3 rounded-xl text-left transition-all ${theme === 'sepia' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  <Palette size={18} className="inline mr-2" />
                  Sepia
                </button>
                <button
                  onClick={() => {
                    changeTheme('dark')
                    setShowChrome(true)
                  }}
                  className={`p-3 rounded-xl text-left transition-all ${theme === 'dark' ? 'bg-slate-700 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  <Moon size={18} className="inline mr-2" />
                  Dark
                </button>
              </div>
            </div>

            {/* Font Size Control */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Text Size</label>
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2">
                <button
                  onClick={() => saveFontSize(Math.max(14, fontSize - 2))}
                  className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all font-bold"
                >
                  A−
                </button>
                <div className="flex-1 text-center font-bold text-slate-900 dark:text-white text-lg">
                  {fontSize}
                </div>
                <button
                  onClick={() => saveFontSize(Math.min(32, fontSize + 2))}
                  className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all font-bold"
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reader Content - Main */}
        <div className="flex-1 flex justify-center px-6 py-8 overflow-hidden">
          {isRendering ? (
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400"></div>
              </div>
              <span className="ml-4 text-slate-700 dark:text-slate-300 text-lg font-medium">Loading page...</span>
            </div>
          ) : (
            <div className="w-full max-w-[680px] overflow-y-auto">
              <div
                className="text-slate-900 dark:text-slate-100 leading-relaxed selection:bg-blue-200 dark:selection:bg-blue-800 selection:text-blue-900 dark:selection:text-blue-100"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: `${fontSize * 1.65}px`,
                  hyphens: 'auto',
                  wordBreak: 'break-word',
                  textAlign: 'left'
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
                        <p key={index} className="first:mt-0">
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
                      This page may contain images or non-selectable content.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Minimal Bottom Navigation with Auto-Hide */}
        <div className={`sticky bottom-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-white/20 dark:border-slate-700/30 px-6 py-3 shadow-sm transition-all duration-300 ${showChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-center gap-6 max-w-7xl mx-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevPage()
              }}
              disabled={currentPage <= 1}
              className="p-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-700 dark:text-slate-300"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-800/60 px-4 py-2 rounded-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              {currentPage} / {numPages || '?'}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNextPage()
              }}
              disabled={currentPage >= numPages}
              className="p-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-700 dark:text-slate-300"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Slim Progress Bar at Bottom */}
        <div className="h-0.5 bg-slate-200/60 dark:bg-slate-800/60">
          <div
            className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${(currentPage / numPages) * 100}%` }}
          ></div>
        </div>
      </div>
    )
  }
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
  const totalStorage = books.reduce((total, book) => total + (book.size || 0), 0)

  return (
    <div className={`min-h-screen ${getThemeClasses()} transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Simple Header: Library on left, Add PDF on right */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Library</h1>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                <span className="hidden sm:inline">Uploading...</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span className="hidden sm:inline">Add PDF</span>
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

        {/* Book Grid or Empty State */}
        {books.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Book size={48} className="text-slate-400 dark:text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">
              No books yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Upload your first PDF or EPUB to get started
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-all font-medium"
            >
              <Upload size={18} />
              Upload Book
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Grid of Book Cards */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', padding: '16px'}}>
              {books.map((book) => {
                const progress = Math.round(((currentBook?.id === book.id ? currentPage : 1) / numPages) * 100) || 0
                const colorGradient = generateColorFromTitle(book.name)
                return (
                  <div key={book.id}>
                    {/* Book Cover Card */}
                    <div
                      onClick={() => openBook(book)}
                      style={{
                        aspectRatio: '3/4',
                        borderRadius: '12px',
                        padding: '12px',
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden'
                      }}
                      className={`bg-gradient-to-br ${colorGradient} shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105`}
                    >
                      {/* Delete Button Overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteBook(book.id)
                        }}
                        className="absolute top-2 right-2 z-20 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all opacity-0 hover:opacity-100 active:scale-95"
                        style={{width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                        title="Delete book"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Title Badge at Bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <h3 className="text-white text-xs font-bold line-clamp-2 leading-tight">
                          {book.name}
                        </h3>
                      </div>
                    </div>

                    {/* Progress Bar Underneath */}
                    <div className="mt-2 h-0.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-300"
                        style={{width: `${progress}%`}}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Stats Tiles at Bottom */}
            <div className="flex gap-4 mt-12 justify-center">
              <div style={{background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 16px'}} className="text-center">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Books</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{books.length}</div>
              </div>
              <div style={{background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 16px'}} className="text-center">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Storage</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatFileSize(totalStorage)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App