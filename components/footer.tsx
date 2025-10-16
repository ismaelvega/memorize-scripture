"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from 'lucide-react';

export function Footer() {
  return (
    <footer className="px-4 py-6 text-center text-xs text-neutral-500">
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1.5">
            Solo datos locales · v1.0
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tus datos de progreso se guardan únicamente en este dispositivo.</p>
        </TooltipContent>
      </Tooltip>
    </footer>
  );
}
