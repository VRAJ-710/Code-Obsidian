console.log('API URL:', import.meta.env.VITE_API_URL) // temporary debug line

export const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || '',

  endpoints: {
    chat: '/chat',
    review: '/review',
    debug: '/debug',
  },

  judge0: {
    url: 'https://judge0-ce.p.rapidapi.com',
    key: import.meta.env.VITE_JUDGE0_KEY || '',
  },

  agents: {
    teacher:  { name: 'Sage', title: 'Teaching Agent',     color: '#FF6B35', avatar: '🧠' },
    reviewer: { name: 'Aria', title: 'Code Review Agent',  color: '#004E89', avatar: '🔍' },
    debugger: { name: 'Rex',  title: 'Debugging Agent',    color: '#7B2D8B', avatar: '🐛' },
  },
}