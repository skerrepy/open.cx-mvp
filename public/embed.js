(function () {
  // Prevent duplicate injection
  if (window.supportAIWidget) {
    return;
  }

  const config = {
    widgetUrl: window.SUPPORT_AI_URL || `${window.location.origin}/widget`,
    position: "bottom-right",
  };

  // Create floating button
  const btn = document.createElement("button");
  btn.textContent = "💬 Chat with us";
  btn.id = "support-ai-button";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = "9999";
  btn.style.padding = "10px 16px";
  btn.style.background = "#2563eb";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.style.fontWeight = "500";
  btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  btn.style.transition = "transform 0.2s, box-shadow 0.2s";

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "scale(1.05)";
    btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  });

  let iframe = null;
  let isOpen = false;

  btn.addEventListener("click", () => {
    if (isOpen) {
      // Close widget
      if (iframe) {
        iframe.remove();
        iframe = null;
      }
      isOpen = false;
      btn.textContent = "💬 Chat with us";
    } else {
      // Open widget
      iframe = document.createElement("iframe");
      iframe.src = config.widgetUrl;
      iframe.id = "support-ai-widget";
      iframe.style.position = "fixed";
      iframe.style.bottom = "70px";
      iframe.style.right = "20px";
      iframe.style.width = "400px";
      iframe.style.height = "600px";
      iframe.style.border = "none";
      iframe.style.borderRadius = "12px";
      iframe.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
      iframe.style.zIndex = "99999";
      iframe.style.background = "white";
      iframe.setAttribute("allowtransparency", "true");

      document.body.appendChild(iframe);
      isOpen = true;
      btn.textContent = "✕ Close";

      // Handle external close events (optional)
      const handleMessage = (event) => {
        if (event.data === "support-ai-close") {
          if (iframe) {
            iframe.remove();
            iframe = null;
          }
          isOpen = false;
          btn.textContent = "💬 Chat with us";
          window.removeEventListener("message", handleMessage);
        }
      };
      window.addEventListener("message", handleMessage);
    }
  });

  document.body.appendChild(btn);

  // Mark as injected
  window.supportAIWidget = true;
})();

