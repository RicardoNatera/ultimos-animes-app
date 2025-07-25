"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const useDark = stored === "dark" || (!stored && prefersDark)

    setTheme(useDark ? "dark" : "light")
    document.documentElement.classList.toggle("dark", useDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  if (!mounted) return null

  const trackWidth = 64
  const knobSize = 28
  const offset = trackWidth - knobSize - 8

  return (
    <button
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      className="w-16 h-9 p-1 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center transition-colors duration-300 shadow"
    >
      {/* Ícono pintado a brocha animado */}
      <motion.div
        initial={false}
        animate={{
          x: theme === "dark" ? offset : 0,
          rotate: theme === "dark" ? 360 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center"
      >
        {theme === "dark" ? (
          // Ícono naranja tipo Marte (modo oscuro)
        <svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
            <defs>
                <clipPath id="blob">
                <path
                    d="M471,278.5Q464,317,438,345.5Q412,374,388,402Q364,430,329.5,444.5Q295,459,258.5,459Q222,459,187,449.5Q152,440,122.5,419.5Q93,399,62.5,376Q32,353,27,314.5Q22,276,21.5,239.5Q21,203,31,167.5Q41,132,60.5,99Q80,66,114,47.5Q148,29,185,25Q222,21,259.5,17Q297,13,328.5,34.5Q360,56,393,75.5Q426,95,443,129.5Q460,164,469,202Q478,240,471,278.5Z"
                    fill="#000000"
                />
                </clipPath>
            </defs>
            <image
                x="0"
                y="0"
                width="100%"
                height="100%"
                clipPath="url(#blob)"
                xlinkHref="/icons/theme-orange.png" 
                preserveAspectRatio="xMidYMid slice"
            />
            </svg>

        ) : (
          // Ícono azul cielo (modo claro)
        <svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
            <defs>
                <clipPath id="blob">
                <path
                    d="M471,278.5Q464,317,438,345.5Q412,374,388,402Q364,430,329.5,444.5Q295,459,258.5,459Q222,459,187,449.5Q152,440,122.5,419.5Q93,399,62.5,376Q32,353,27,314.5Q22,276,21.5,239.5Q21,203,31,167.5Q41,132,60.5,99Q80,66,114,47.5Q148,29,185,25Q222,21,259.5,17Q297,13,328.5,34.5Q360,56,393,75.5Q426,95,443,129.5Q460,164,469,202Q478,240,471,278.5Z"
                    fill="#000000"
                />
                </clipPath>
            </defs>
            <image
                x="0"
                y="0"
                width="100%"
                height="100%"
                clipPath="url(#blob)"
                xlinkHref="/icons/theme-blue.png"
                preserveAspectRatio="xMidYMid slice"
            />
            </svg>
        )}
      </motion.div>
    </button>
  )
}