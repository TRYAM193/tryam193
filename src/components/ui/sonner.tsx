import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-200 group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl shadow-black/50 overflow-hidden relative backdrop-blur-md font-sans",
          description: "group-[.toast]:text-slate-400",
          actionButton:
            "group-[.toast]:bg-orange-500 group-[.toast]:text-white font-bold",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-400",
          success:
            "group-[.toaster]:bg-green-500/10 group-[.toaster]:text-green-400 group-[.toaster]:border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
          error:
            "group-[.toaster]:bg-red-500/10 group-[.toaster]:text-red-400 group-[.toaster]:border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
          info:
            "group-[.toaster]:bg-blue-500/10 group-[.toaster]:text-blue-400 group-[.toaster]:border-blue-500/20",
          warning:
            "group-[.toaster]:bg-orange-500/10 group-[.toaster]:text-orange-400 group-[.toaster]:border-orange-500/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
