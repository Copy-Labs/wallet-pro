import React, { useState, useEffect } from "react"
import { Card, Text, Button, Flex } from "@radix-ui/themes"
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon, XIcon } from "lucide-react"

export interface ToastProps {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  description?: string
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, type, title, description, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose(id), 300) // Allow fade out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, id, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon size={20} />
      case "error":
        return <XCircleIcon size={20} />
      case "warning":
        return <AlertCircleIcon size={20} />
      default:
        return <AlertCircleIcon size={20} />
    }
  }

  const getColor = () => {
    switch (type) {
      case "success":
        return "green"
      case "error":
        return "red"
      case "warning":
        return "orange"
      default:
        return "blue"
    }
  }

  if (!isVisible) return null

  return (
    <Card
      className={`transition-all duration-300 ease-in-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{
        minWidth: "320px",
        maxWidth: "480px",
        borderLeft: `4px solid var(--${getColor()}-9)`,
      }}
    >
      <Flex align="start" gap="3" p="3">
        <Flex
          align="center"
          justify="center"
          style={{
            color: `var(--${getColor()}-9)`,
            flexShrink: 0,
          }}
        >
          {getIcon()}
        </Flex>

        <Flex direction="column" gap="1" flex="1">
          <Text size="3" weight="medium">
            {title}
          </Text>
          {description && (
            <Text size="2" color="gray">
              {description}
            </Text>
          )}
        </Flex>

        <Button
          size="1"
          variant="ghost"
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose(id), 300)
          }}
          style={{ flexShrink: 0 }}
        >
          <XIcon size={16} />
        </Button>
      </Flex>
    </Card>
  )
}

export interface ToastContainerProps {
  toasts: ToastProps[]
  onRemoveToast: (id: string) => void
}

export function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-2"
      style={{ pointerEvents: "none" }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <Toast {...toast} onClose={onRemoveToast} />
        </div>
      ))}
    </div>
  )
}

// Toast hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = (toast: Omit<ToastProps, "id" | "onClose">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: (toastId) => removeToast(toastId),
    }

    setToasts((prev) => [...prev, newToast])

    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }

    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const success = (title: string, description?: string, duration?: number) => {
    return addToast({ type: "success", title, description, duration })
  }

  const error = (title: string, description?: string, duration?: number) => {
    return addToast({ type: "error", title, description, duration })
  }

  const warning = (title: string, description?: string, duration?: number) => {
    return addToast({ type: "warning", title, description, duration })
  }

  const info = (title: string, description?: string, duration?: number) => {
    return addToast({ type: "info", title, description, duration })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}
