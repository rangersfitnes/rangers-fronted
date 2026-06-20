import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'

export const firebaseConfig = {
  apiKey: 'AIzaSyDJsOFFmdcsAPtLMp92UZtOZCn9pNHcAIs',
  authDomain: 'rangers-box.firebaseapp.com',
  projectId: 'rangers-box',
  storageBucket: 'rangers-box.firebasestorage.app',
  messagingSenderId: '300802464391',
  appId: '1:300802464391:web:ea0e47b1b9d0805f41f622',
  measurementId: 'G-606MHBVPRG',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

export const analytics =
  typeof window !== 'undefined' ? getAnalytics(app) : null

export default app
