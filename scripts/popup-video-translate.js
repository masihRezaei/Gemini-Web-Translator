// Video Translate tab functionality
document.addEventListener("DOMContentLoaded", function() {
  // Get elements
  const videoTargetLang = document.getElementById("videoTargetLang");
  const videoTranslateTone = document.getElementById("videoTranslateTone");
  const enableVideoTranslate = document.getElementById("enableVideoTranslate");
  const subtitleDisplayModeSelect = document.getElementById("subtitleDisplayMode");
  const saveVideoTranslateSettings = document.getElementById("saveVideoTranslateSettings");
  
  // شخصی‌سازی زیرنویس
  const subtitleFontSize = document.getElementById("subtitle-font-size");
  const subtitleTextColor = document.getElementById("subtitle-text-color");
  const subtitleBgColor = document.getElementById("subtitle-bg-color");
  const subtitleBgOpacity = document.getElementById("subtitle-bg-opacity");
  const subtitleOpacity = document.getElementById("subtitle-opacity");
  
  // نمایش مقادیر
  const fontSizeValue = document.getElementById("font-size-value");
  const bgOpacityValue = document.getElementById("bg-opacity-value");
  const opacityValue = document.getElementById("opacity-value");
  
  if (!videoTargetLang || !videoTranslateTone || !enableVideoTranslate || 
      !subtitleDisplayModeSelect || !saveVideoTranslateSettings) {
    console.log("Video translate elements not found");
    return;
  }
  
  // بروزرسانی نمایش مقادیر
  if (subtitleFontSize && fontSizeValue) {
    subtitleFontSize.addEventListener("input", () => {
      fontSizeValue.textContent = `${subtitleFontSize.value}px`;
    });
  }
  
  if (subtitleBgOpacity && bgOpacityValue) {
    subtitleBgOpacity.addEventListener("input", () => {
      bgOpacityValue.textContent = `${subtitleBgOpacity.value}%`;
    });
  }
  
  if (subtitleOpacity && opacityValue) {
    subtitleOpacity.addEventListener("input", () => {
      opacityValue.textContent = `${subtitleOpacity.value}%`;
    });
  }
  
  // Load video translate settings
  browser.storage.local.get([
    "youtubeSubtitlesEnabled",
    "lastTargetLang",
    "videoTranslateTone",
    "subtitleDisplayMode",
    "subtitleFontSize",
    "subtitleBgColor",
    "subtitleTextColor",
    "subtitleOpacity"
  ]).then(result => {
    // Set video target language to match the main target language
    if (result.lastTargetLang) {
      videoTargetLang.value = result.lastTargetLang;
    }
    
    // Set tone if saved
    if (result.videoTranslateTone) {
      videoTranslateTone.value = result.videoTranslateTone;
    }
    
    // Set enabled state
    enableVideoTranslate.checked = result.youtubeSubtitlesEnabled !== false;
    
    // Set display mode
    if (result.subtitleDisplayMode) {
      subtitleDisplayModeSelect.value = result.subtitleDisplayMode;
    }
    
    // تنظیم مقادیر شخصی‌سازی زیرنویس
    if (result.subtitleFontSize && subtitleFontSize) {
      const fontSize = parseInt(result.subtitleFontSize);
      subtitleFontSize.value = fontSize;
      if (fontSizeValue) fontSizeValue.textContent = `${fontSize}px`;
    }
    
    if (result.subtitleTextColor && subtitleTextColor) {
      subtitleTextColor.value = result.subtitleTextColor;
    }
    
    if (result.subtitleBgColor && subtitleBgColor && subtitleBgOpacity) {
      // استخراج رنگ و شفافیت از rgba
      const rgba = result.subtitleBgColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (rgba) {
        const r = parseInt(rgba[1]);
        const g = parseInt(rgba[2]);
        const b = parseInt(rgba[3]);
        const a = parseFloat(rgba[4]);
        
        // تبدیل RGB به هگز
        const hex = rgbToHex(r, g, b);
        subtitleBgColor.value = hex;
        
        // تنظیم شفافیت
        subtitleBgOpacity.value = Math.round(a * 100);
        if (bgOpacityValue) bgOpacityValue.textContent = `${Math.round(a * 100)}%`;
      }
    }
    
    if (result.subtitleOpacity && subtitleOpacity) {
      const opacity = parseFloat(result.subtitleOpacity) * 100;
      subtitleOpacity.value = opacity;
      if (opacityValue) opacityValue.textContent = `${opacity}%`;
    }
  });
  
  // Save video translate settings
  saveVideoTranslateSettings.addEventListener("click", () => {
    // تنظیمات شخصی‌سازی زیرنویس
    const fontSize = subtitleFontSize ? `${subtitleFontSize.value}px` : "16px";
    const textColor = subtitleTextColor ? subtitleTextColor.value : "#ffffff";
    const bgOpacity = subtitleBgOpacity ? subtitleBgOpacity.value / 100 : 0.8;
    const opacity = subtitleOpacity ? subtitleOpacity.value / 100 : 1;
    
    // تبدیل رنگ هگز به rgba
    const bgColorHex = subtitleBgColor ? subtitleBgColor.value : "#1a73e8";
    const bgColorRgb = hexToRgb(bgColorHex);
    const bgColorRgba = `rgba(${bgColorRgb}, ${bgOpacity})`;
    
    const settings = {
      youtubeSubtitlesEnabled: enableVideoTranslate.checked,
      lastTargetLang: videoTargetLang.value,
      videoTranslateTone: videoTranslateTone.value,
      subtitleDisplayMode: subtitleDisplayModeSelect.value,
      subtitleFontSize: fontSize,
      subtitleBgColor: bgColorRgba,
      subtitleTextColor: textColor,
      subtitleOpacity: opacity.toString()
    };
    
    browser.storage.local.set(settings).then(() => {
      // Show success message
      const notification = document.createElement("div");
      notification.textContent = "Video translation settings saved!";
      notification.style.backgroundColor = "#059669";
      notification.style.color = "white";
      notification.style.padding = "8px 12px";
      notification.style.borderRadius = "4px";
      notification.style.marginTop = "10px";
      notification.style.textAlign = "center";
      
      const infoSection = document.querySelector(".video-translate-info");
      infoSection.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
      
      // Send message to content script to update settings
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs && tabs.length > 0) {
          browser.tabs.sendMessage(tabs[0].id, {
            action: "updateYouTubeSubtitlesSettings",
            enabled: settings.youtubeSubtitlesEnabled,
            targetLanguage: settings.lastTargetLang,
            tone: settings.videoTranslateTone,
            displayMode: settings.subtitleDisplayMode
          }).catch(error => {
            console.log("Error updating YouTube subtitles settings:", error);
          });
          
          // ارسال تنظیمات شخصی‌سازی زیرنویس
          browser.tabs.sendMessage(tabs[0].id, {
            action: "updateSubtitleCustomization",
            fontSize: settings.subtitleFontSize,
            bgColor: settings.subtitleBgColor,
            textColor: settings.subtitleTextColor,
            opacity: settings.subtitleOpacity
          }).catch(error => {
            console.log("Error updating subtitle customization:", error);
          });
        }
      });
    });
  });
  
  // Update main target language when video target language changes
  videoTargetLang.addEventListener("change", () => {
    browser.storage.local.set({ lastTargetLang: videoTargetLang.value });
    
    // Also update the main target language dropdown if it exists
    const mainTargetLang = document.getElementById("targetLang");
    if (mainTargetLang) {
      mainTargetLang.value = videoTargetLang.value;
    }
  });
  
  // تبدیل RGB به هگز
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  
  // تبدیل هگز به RGB
  function hexToRgb(hex) {
    // حذف # از ابتدای رنگ
    hex = hex.replace('#', '');
    
    // تبدیل به RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }
});