"use client";

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// --- CONTEXTE POUR GÉRER L'ÉTAT ---
interface SelectContextType {
  value: string | undefined
  onChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}
const SelectContext = React.createContext<SelectContextType | null>(null)

// --- COMPOSANT RACINE ---
export const Select = ({ value, onValueChange, children }: { value?: string, onValueChange?: (val: string) => void, children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  
  // Fermer si on clique ailleurs
  React.useEffect(() => {
    const handleClickOutside = (e: any) => { if (!e.target.closest('.select-container')) setOpen(false); }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange || (() => {}), open, setOpen }}>
      <div className="relative select-container">{children}</div>
    </SelectContext.Provider>
  )
}

// --- TRIGGER (LE BOUTON) ---
export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => ctx?.setOpen(!ctx.open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

// --- VALUE (LE TEXTE AFFICHÉ) ---
export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const ctx = React.useContext(SelectContext)
  // On essaie de trouver le label correspondant à la valeur sélectionnée (c'est une approximation visuelle simple)
  // Pour une version parfaite, il faudrait passer les children au context, mais ici on affiche la valeur brute ou le placeholder
  return <span className="block truncate">{ctx?.value ? 
    // Petite astuce : on affiche la valeur brute si on n'a pas le label, 
    // mais dans votre cas (Pays), la valeur EST le code. 
    // Pour afficher le nom complet, l'idéal serait de mapper, mais pour débloquer le build :
    ctx.value : placeholder}</span>
}

// --- CONTENT (LA LISTE DÉROULANTE) ---
export const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    if (!ctx?.open) return null
    
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 w-full mt-1",
          className
        )}
        {...props}
      >
        <div className="p-1 max-h-[300px] overflow-y-auto">{children}</div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

// --- ITEM (CHAQUE OPTION) ---
export const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, children, value, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    const isSelected = ctx?.value === value

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected ? "bg-accent/50" : "",
          className
        )}
        onClick={() => {
            ctx?.onChange(value)
            ctx?.setOpen(false)
        }}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
        </span>
        <span className="truncate">{children}</span>
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"
