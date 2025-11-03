"use client";

import { useState } from "react";
import Widget from "@/components/widget/Widget";

export default function WidgetPage() {
  return (
    <div className="w-screen h-screen p-4 bg-gray-100">
      <div className="max-w-md mx-auto h-full">
        <Widget />
      </div>
    </div>
  );
}

