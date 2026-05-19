type Level = 'info' | 'warn' | 'error'

function write(level: Level, event: string, data?: object) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data })
  // console.log works in both Node.js and Edge runtimes
  console.log(entry)
}

export const logger = {
  info: (event: string, data?: object) => write('info', event, data),
  warn: (event: string, data?: object) => write('warn', event, data),
  error: (event: string, data?: object) => write('error', event, data),
}
