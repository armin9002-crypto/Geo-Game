# Kindle Reader - Modern PDF Reader for iPad

A stunning, modern PDF reading app built with React, Tailwind CSS, and PDF.js. Features intelligent text extraction, beautiful typography, and comprehensive functionality.

## ✨ Features

- **📖 Smart Text Extraction**: Advanced PDF text extraction with intelligent layout detection
- **🎨 Beautiful Typography**: Customizable font sizes, justified text, and optimal line spacing
- **🎯 Modern UI**: Glassmorphism design with smooth animations and polished interactions
- **🌙 Multiple Themes**: Light, Sepia, and Dark reading modes with seamless transitions
- **📊 Reading Progress**: Visual progress bar and page navigation with jump controls
- **📚 Digital Library**: Elegant grid layout with enhanced book cards and metadata
- **🗑️ Book Management**: Delete books with confirmation dialogs
- **💾 Progress Persistence**: Remembers your reading position across sessions
- **📱 iPad Optimized**: Touch-friendly interface with PWA support
- **⚡ Performance**: Optimized text rendering and smooth scrolling

## 🚀 Getting Started

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5175/](http://localhost:5175/) in your browser.

3. **Build for production**:
   ```bash
   npm run build
   ```

## 📱 iPad Installation

1. Open the app in Safari on your iPad
2. Tap the Share button → "Add to Home Screen"
3. The app appears as a native icon with full-screen experience

## 🎨 Usage Guide

### Library View
- **Upload Books**: Click "Add Book" and select PDF files
- **View Stats**: See total books and storage used with animated counters
- **Delete Books**: Hover over books to reveal delete button
- **Switch Themes**: Use the enhanced theme toggle in the action bar

### Reader View
- **Smart Text Layout**: Automatically extracts and formats text for optimal reading
- **Font Controls**: Adjust font size with A- and A+ buttons (14px to 32px)
- **Page Navigation**: Use Previous/Next buttons or jump 10 pages at a time
- **Reading Progress**: Visual progress bar shows completion percentage
- **Themes**: Switch between Light, Sepia, and Dark modes while reading

## 🛠️ Technical Details

- **React 19** with modern hooks and state management
- **Tailwind CSS** for responsive, utility-first styling with custom gradients
- **PDF.js** for intelligent PDF text extraction with layout analysis
- **LocalForage** for IndexedDB storage (handles large files)
- **Lucide React** for consistent iconography
- **PWA Ready** with manifest and service worker support

## 🎯 Design Philosophy

- **Intelligent Text Flow**: Advanced algorithm groups text by lines and paragraphs
- **Typography First**: Justified text, optimal line heights, and smooth scrolling
- **Glassmorphism**: Modern frosted glass effects with backdrop blur
- **Smooth Animations**: 200-500ms transitions with hover effects and scaling
- **Accessibility**: Proper contrast ratios, touch targets, and keyboard navigation
- **Performance**: Optimized rendering and memory management

## 📊 Text Extraction Features

- **Line Detection**: Groups text items by vertical proximity (8px tolerance)
- **Horizontal Sorting**: Orders text within lines by X-coordinate
- **Paragraph Grouping**: Combines lines into cohesive paragraphs
- **Whitespace Normalization**: Removes excessive spacing and line breaks
- **Fallback Handling**: Graceful handling of non-text content

## 🌟 Key Improvements

- **Smart Text Extraction**: Advanced PDF parsing creates readable, flowing text
- **Enhanced Typography**: Custom font sizing, justified alignment, and proper spacing
- **Modern UI Elements**: Rounded corners, shadows, gradients, and micro-interactions
- **Improved Navigation**: Jump controls, progress indicators, and smooth transitions
- **Visual Polish**: Hover effects, scaling animations, and refined color schemes
- **Better UX**: Loading states, error handling, and intuitive controls

## 🔧 Troubleshooting

**Text Not Extracting?**
- PDFs with images/scanned content may not have selectable text
- Try PDFs created from text documents (Word, Google Docs, etc.)
- Some PDFs may have complex layouts that need manual adjustment

**Performance Issues?**
- Large PDFs may take longer to process
- Font size affects rendering performance
- Consider splitting very large documents

**Display Problems?**
- Ensure browser supports modern CSS features
- Try refreshing the page or clearing browser cache
- Check console for any JavaScript errors

---

**Ready to experience intelligent PDF reading?** Upload a text-based PDF and discover how smart text extraction transforms your reading experience! 📚✨

## 🛠️ Technical Details

- **React 19** with modern hooks and state management
- **Tailwind CSS** for responsive, utility-first styling
- **PDF.js** for reliable PDF rendering with canvas
- **LocalForage** for IndexedDB storage (handles large files)
- **Lucide React** for consistent iconography
- **PWA Ready** with manifest and service worker support

## 🎯 Design Philosophy

- **Glassmorphism**: Modern frosted glass effects
- **Smooth Animations**: 200-500ms transitions throughout
- **Accessibility**: Proper contrast ratios and touch targets
- **Performance**: Optimized rendering and memory management
- **Mobile-First**: Responsive design that works on all devices

## 📊 File Size Support

- **Recommended**: PDFs up to 50MB work smoothly
- **Large Files**: 100MB+ PDFs may have slower initial load
- **Storage**: Uses browser IndexedDB (typically 1GB+ available)

## 🌟 Key Improvements

- **Custom PDF Rendering**: Direct PDF.js integration for better reliability
- **Modern Aesthetics**: Gradient backgrounds and glassmorphism
- **Enhanced UX**: Loading states, error handling, and confirmations
- **Book Management**: Full CRUD operations for your library
- **Responsive Design**: Beautiful on desktop, tablet, and mobile

## 🔧 Troubleshooting

**PDF Not Loading?**
- Check browser console for errors
- Try smaller PDF files first
- Ensure PDFs aren't password-protected

**Slow Performance?**
- Reduce PDF file size
- Close other browser tabs
- Try a different browser

**Storage Issues?**
- Clear browser data if needed
- Check available storage space

---

**Ready to build your digital library?** Upload your first PDF and start reading! 📚✨

## 🚀 Deploy to Vercel (Free & Public)

This app is ready for Vercel deployment. Vercel has a free hobby tier for personal and public projects, and the hosted site will be reachable by anyone with the link.

### Deploy with GitHub (recommended)
1. Push your project to a GitHub repository.
2. Create a free account at [vercel.com](https://vercel.com).
3. Import the repository into Vercel.
4. Set the build command to:
   ```bash
   npm run build
   ```
5. Set the output directory to:
   ```bash
   dist
   ```
6. Deploy.

Vercel will provide a public URL that anyone can open on iPad or phone.

### Deploy with the Vercel CLI
1. Install Vercel:
   ```bash
   npm install -g vercel
   ```
2. Log in:
   ```bash
   vercel login
   ```
3. Deploy from the project folder:
   ```bash
   vercel --prod
   ```

### Notes
- Vercel's free plan supports static sites like this app.
- Your deployed app will be publicly accessible via the generated Vercel URL.
- If you want a nicer shared link, you can add a custom domain later.

### Local preview after build
```bash
npm run preview -- --host
```

Open the local network URL on your iPad or phone to test before publishing.
