'use client'
import { VersePicker } from "@/components/VersePicker/VersePicker";
import { store } from "@/app/store";
import { Provider } from "react-redux";

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
