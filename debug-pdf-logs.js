// إضافة هذا الكود لفحص أخطاء PDF في المتصفح
console.log('🔍 PDF Debug Mode Enabled')

// Override console.error to catch PDF errors
const originalError = console.error
console.error = function(...args) {
  if (args.some(arg => typeof arg === 'string' && arg.includes('PDF'))) {
    console.log('🚨 PDF Error Detected:', ...args)
  }
  originalError.apply(console, args)
}

// Monitor PDF download attempts
window.addEventListener('beforeunload', function() {
  console.log('📄 PDF download attempt detected')
})

// Check jsPDF availability
if (typeof window !== 'undefined' && window.jsPDF) {
  console.log('✅ jsPDF library loaded successfully')
} else {
  console.log('❌ jsPDF library not available')
}
