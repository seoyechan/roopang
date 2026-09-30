import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './ga.ts'
import './styles.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
