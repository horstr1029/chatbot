module.exports = {
  appId: 'za.gloworm.mst-chatbot',
  productName: 'MST Chatbot',
  copyright: 'MST',

  directories: {
    output: 'dist',
  },

  files: [
    'main.js',
    'preload.js',
    'resources/**',
    'node_modules/**',
    '!node_modules/.cache/**',
  ],

  win: {
    target: [{ target: 'portable', arch: ['x64'] }],
    icon: 'resources/icon.png',
    // No code-signing certificate — Windows will show an "unknown publisher" warning
    // To sign: add certificateFile + certificatePassword here
  },
}
