"use client";
import * as React from "react";
import type { BookIndexEntry } from "@/components/mobile/flow";
import type { Verse } from "@/lib/types";
import { CitasChallenge } from "@/components/citas-challenge";

interface CitasRoundProps {
  verse: Verse;
  parsed: {
    bookKey: string | null;
    chapter: number;
    start: number;
    end: number;
  };
  bookIndex: BookIndexEntry[];
  onResult: (correct: boolean) => void;
}

export function CitasRound({ verse, bookIndex, onResult }: CitasRoundProps) {
  return (
    <CitasChallenge
      verse={verse}
      bookIndex={bookIndex}
      onComplete={(success) => {
        if (!success) {
          // Optional: handle failure logging
        }
      }}
      onNext={() => onResult(true)}
    />
  );
}
