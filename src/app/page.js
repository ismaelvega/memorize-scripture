'use client'
import { VersePicker } from "@/components/VersePicker/VersePicker";
import { store } from "@/app/store";
import { Provider, useSelector } from "react-redux";
import { VerseContainer } from "@/components/VerseContainer/VerseContainer";
import { VersesChunksContainer } from "@/components/VersesChunksContainer/VersesChunksContainer";


export default function Home() {
  return (
    <Provider store={store}>
      <div>
        <h1>Home</h1>
        <VersePicker />
      </div>
    </Provider>
  );
}
