"use client"
import { useContext, useEffect, useCallback, useState } from "react"
import { Delete } from "lucide-react"
import { AppContext } from "@/context/AppContext"
import { validateWord } from "@/utils/wordValidator"
import gsap from "gsap"

const Keyboard = () => {
  const { currentRow, setCurrentRow, currentCol, setCurrentCol, gridData, setGridData, validateCurrentWord, gameOver, showNotification, targetWord } =
    useContext(AppContext)

  // Track key statuses for coloring the keyboard
  const [keyStatuses, setKeyStatuses] = useState({})

  // Update key statuses based on grid data
  useEffect(() => {
    const newKeyStatuses = { ...keyStatuses }

    gridData.forEach((cell) => {
      if (cell.char && cell.status) {
        // Only update if the new status is "better" than the existing one
        // Priority: correct > present > absent
        const currentStatus = newKeyStatuses[cell.char] || ""

        if (
          cell.status === "correct" ||
          (cell.status === "present" && currentStatus !== "correct") ||
          (!currentStatus && cell.status === "absent")
        ) {
          newKeyStatuses[cell.char] = cell.status
        }
      }
    })

    setKeyStatuses(newKeyStatuses)
  }, [gridData])

  const handleKeyPress = useCallback(
    (key) => {
      if (gameOver) return // Don't allow input if game is over

      if (currentRow >= 6) return // Game is complete

      const currentPosition = currentRow * 5 + currentCol

      // Handle backspace/delete key
      if (key === "Backspace" || key === "Delete" || (typeof key === "object" && key.type === "icon")) {
        if (currentCol > 0) {
          const newGridData = [...gridData]
          newGridData[currentPosition - 1] = { char: "", status: "" }
          setGridData(newGridData)
          setCurrentCol((prev) => prev - 1)
        }
        return
      }

      if (key === "Enter") {
        // Check if the row has fewer than 5 letters
        if (currentCol < 5) {
          showNotification(`Word must be 5 letters. You've typed ${currentCol} so far.`, "warning");
          return;
        }
        
        // Get the current word
        const startIdx = currentRow * 5;
        const currentWord = gridData
          .slice(startIdx, startIdx + 5)
          .map((cell) => cell.char)
          .join("");
        
        // Use the dictionary-based word validator for early client-side validation
        const validationResult = validateWord(currentWord);
        if (!validationResult.valid) {
          showNotification(validationResult.reason, "error");
          return;
        }

        // Special handling for the last row (row 5)
        if (currentRow === 5) {
          validateCurrentWord().then((isCorrect) => {
            // Game over regardless of the result in the last row
            if (!isCorrect) {
              showNotification(`😔 You've used all your tries. The correct word was '${targetWord}'. Come back tomorrow!`, "error");
            }
          })
          return;
        }
        
        // Normal validation for other rows
        validateCurrentWord().then((isCorrect) => {
          if (!isCorrect && currentRow < 5) {
            // Move to next row only if word is incorrect and not in the last row
            setCurrentRow((prev) => prev + 1)
            setCurrentCol(0)
          }
        })
        return
      }

      // Handle normal letter input
      if (typeof key === 'string' && /^[A-Z]$/.test(key)) {
        // Only allow typing if we haven't filled the row yet
        if (currentCol < 5) {
          const newGridData = [...gridData]
          newGridData[currentPosition] = { char: key, status: "" }
          setGridData(newGridData)
          setCurrentCol((prev) => prev + 1)
        } else {
          // We've already filled 5 letters, show notification
          showNotification("You've already typed 5 letters. Press Enter to submit or Backspace to edit.", "info");
        }
      }
    },
    [currentRow, currentCol, gridData, setGridData, setCurrentCol, setCurrentRow, validateCurrentWord, gameOver, showNotification, targetWord],
  )

  // Define rows array first
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Enter", "Z", "X", "C", "V", "B", "N", "M", { label: "", icon: <Delete />, type: "icon", action: "Delete" }],
  ]

  // Colors for animations
  const colors = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f97316", // Orange
    "#10b981", // Green
    "#3b82f6", // Blue
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#a855f7", // Violet
  ]

  // Function to get key background color based on status
  const getKeyBackgroundColor = (key) => {
    if (typeof key === "object") return "#EAEAF1" // Default for special keys

    const status = keyStatuses[key]
    switch (status) {
      case "correct":
        return "#6aaa64" // Green
      case "present":
        return "#c9b458" // Yellow
      case "absent":
        return "#787c7e" // Gray
      default:
        return "#EAEAF1" // Default
    }
  }

  // Function to get key text color based on status
  const getKeyTextColor = (key) => {
    if (typeof key === "object") return "#29296E" // Default for special keys

    return keyStatuses[key] ? "#ffffff" : "#29296E" // White for colored keys, default otherwise
  }

  const handleButtonClick = (key, event) => {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    // Create ripple effect
    const ripple = document.createElement("div")
    ripple.style.position = "absolute"
    ripple.style.width = "5px"
    ripple.style.height = "5px"
    ripple.style.background = `rgba(41, 41, 110, 0.2)`
    ripple.style.borderRadius = "50%"
    ripple.style.pointerEvents = "none"
    button.appendChild(ripple)

    // Select a random color from the expanded colors array
    const borderColor = colors[Math.floor(Math.random() * colors.length)]

    gsap
      .timeline()
      .to(button, {
        scale: 0.92,
        backgroundColor: getKeyBackgroundColor(key),
        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)",
        y: 2,
        duration: 0.1,
        ease: "power2.in",
      })
      .to(
        ripple,
        {
          scale: 40,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => ripple.remove(),
        },
        0,
      )
      .to(
        button,
        {
          scale: 1,
          y: 0,
          backgroundColor: getKeyBackgroundColor(key),
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          duration: 0.3,
          ease: "elastic.out(1, 0.3)",
        },
        0.2,
      )

    // Border trace animation
    gsap
      .timeline()
      .set(button, {
        border: "2px solid transparent",
      })
      .to(button, {
        borderRightColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(button, {
        borderTopColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(button, {
        borderLeftColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(button, {
        borderBottomColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(button, {
        borderColor: "transparent",
        duration: 0.3,
        delay: 0.1,
      })

    // Handle the actual key press
    if (typeof key === "object" && key.type === "icon" && key.action === "Delete") {
      handleKeyPress("Backspace")
    } else {
      handleKeyPress(key)
    }
  }

  // Add this function to trigger animations
  const triggerButtonAnimation = (keyValue) => {
    const keyboardDiv = document.querySelector(".keyboard")
    if (!keyboardDiv) return

    const buttons = keyboardDiv.querySelectorAll("button")
    const targetButton = Array.from(buttons).find((button) => {
      if (keyValue === "Backspace" || keyValue === "Delete") {
        // Look for the SVG icon instead of text
        return button.querySelector("svg") !== null;
      }
      return button.textContent === keyValue.toUpperCase() || (keyValue === "Enter" && button.textContent === "Enter")
    })

    if (targetButton) {
      const ripple = document.createElement("div")
      ripple.style.position = "absolute"
      ripple.style.width = "5px"
      ripple.style.height = "5px"
      ripple.style.background = `rgba(41, 41, 110, 0.2)`
      ripple.style.borderRadius = "50%"
      ripple.style.pointerEvents = "none"
      targetButton.appendChild(ripple)

      // Select a random color from the colors array
      const borderColor = colors[Math.floor(Math.random() * colors.length)]

      gsap
        .timeline()
        .to(targetButton, {
          scale: 0.92,
          backgroundColor: targetButton.style.backgroundColor,
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)",
          y: 2,
          duration: 0.1,
          ease: "power2.in",
        })
        .to(
          ripple,
          {
            scale: 40,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => ripple.remove(),
          },
          0,
        )
        .to(
          targetButton,
          {
            scale: 1,
            y: 0,
            backgroundColor: targetButton.style.backgroundColor,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            duration: 0.3,
            ease: "elastic.out(1, 0.3)",
          },
          0.2,
        )

      // Border trace animation - Fix syntax error
      const tl = gsap.timeline();
      tl.set(targetButton, {
        border: "2px solid transparent",
      })
      .to(targetButton, {
        borderRightColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(targetButton, {
        borderTopColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(targetButton, {
        borderLeftColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(targetButton, {
        borderBottomColor: borderColor,
        duration: 0.15,
        ease: "power1.inOut",
      })
      .to(targetButton, {
        borderColor: "transparent",
        duration: 0.3,
        delay: 0.1,
      })
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only prevent default for keyboard inputs we're handling
      const key = event.key;
      const preventKeys = ['Backspace', 'Enter'];
      const isLetter = /^[a-zA-Z]$/.test(key);

      if (preventKeys.includes(key) || isLetter) {
        event.preventDefault(); // Prevent default keyboard behavior
      }

      if (key === "Backspace") {
        handleKeyPress("Backspace")
        setTimeout(() => triggerButtonAnimation("Backspace"), 0)
      } else if (key === "Enter") {
        handleKeyPress("Enter")
        setTimeout(() => triggerButtonAnimation("Enter"), 0)
      } else if (isLetter) {
        const upperKey = key.toUpperCase()
        handleKeyPress(upperKey)
        setTimeout(() => triggerButtonAnimation(upperKey), 0)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyPress])

  return (
    <div className="w-full max-w-xl mx-auto mt-8 mb-4 keyboard">
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className={`flex justify-center gap-1.5 ${rowIndex === 1 ? "px-8" : ""}`}>
            {row.map((key, keyIndex) => {
              if (typeof key === "object" && key.type === "icon") {
                return (
                  <button
                    key={keyIndex}
                    onClick={(e) => handleButtonClick(key, e)}
                    className="relative overflow-hidden bg-[#EAEAF1] text-[#29296E] font-normal w-[100px] h-[58px] rounded-lg shadow-md flex items-center justify-center transition-all duration-150 font-roboto text-2xl hover:brightness-95"
                  >
                    {key.icon}
                  </button>
                )
              }

              return (
                <button
                  key={keyIndex}
                  onClick={(e) => handleButtonClick(key, e)}
                  className={`relative overflow-hidden font-normal rounded-lg shadow-md flex items-center justify-center transition-all duration-150 font-roboto text-2xl hover:brightness-95 ${
                    key === "Enter" ? "w-[100px]" : rowIndex === 1 ? "w-[68px]" : "w-[65px]"
                  } h-[58px]`}
                  style={{
                    backgroundColor: getKeyBackgroundColor(key),
                    color: getKeyTextColor(key),
                  }}
                >
                  {key}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Keyboard

