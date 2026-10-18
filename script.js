"use strict";

const $ = (id) => document.getElementById(id);

const canvas = $("previewCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const questionInput = $("question");
const correctInput = $("correct");
const watermarkInput = $("watermark");
const templateInput = $("template");
const formatInput = $("format");

const generateBtn = $("generateBtn");
const downloadBtn = $("downloadBtn");
const statusEl = $("status");
const placeholder = $("previewPlaceholder");

const LETTERS = ["أ", "ب", "ج", "د"];

const OPTION_COLORS = [
  { main: "#c18aff", dark: "#312447" },
  { main: "#78aaff", dark: "#202e4e" },
  { main: "#4de1cd", dark: "#193a3c" },
  { main: "#ff8eb7", dark: "#40243a" }
];

const FORMATS = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1350 },
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1200, height: 675 }
};

const THEMES = {
  neon: {
    bg1: "#0c1023",
    bg2: "#18213d",
    card: "#1c2542",
    cardBorder: "#3b4b70",
    text: "#f6f7ff",
    muted: "#a5afcc",
    purple: "#c181ff",
    blue: "#7ca9ff",
    cyan: "#4ce2d0"
  },
  purple: {
    bg1: "#140e27",
    bg2: "#251744",
    card: "#2a2047",
    cardBorder: "#594278",
    text: "#fff7ff",
    muted: "#c1b0d9",
    purple: "#d28cff",
    blue: "#a19bff",
    cyan: "#5be2db"
  },
  minimal: {
    bg1: "#101522",
    bg2: "#171f30",
    card: "#1b2435",
    cardBorder: "#344155",
    text: "#f5f7fb",
    muted: "#9eabbc",
    purple: "#a9aaff",
    blue: "#82b5ff",
    cyan: "#76dfd1"
  }
};

let hasGenerated = false;
let isGenerating = false;
let logoImage = null;
let logoReady = false;
let logoFailed = false;

/*
 * Load the logo only once.
 * The design still works if logo.png is missing.
 */
function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      logoImage = img;
      logoReady = true;
      resolve(true);
    };

    img.onerror = () => {
      logoFailed = true;
      resolve(false);
    };

    img.src = "logo.png";
  });
}

const logoPromise = loadLogo();

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.style.color = error ? "#ff9bad" : "";
}

function getOptions() {
  return [
    $("optionA").value.trim(),
    $("optionB").value.trim(),
    $("optionC").value.trim(),
    $("optionD").value.trim()
  ];
}

function getData() {
  return {
    question: questionInput.value.trim(),
    options: getOptions(),
    correct: correctInput.value,
    watermark: watermarkInput.value.trim(),
    template: templateInput.value,
    format: formatInput.value
  };
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundRect(context, x, y, width, height, radius, color) {
  roundRect(context, x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

function strokeRoundRect(context, x, y, width, height, radius, color, lineWidth = 2) {
  roundRect(context, x, y, width, height, radius);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
}

function createGradient(x1, y1, x2, y2, stops) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

  for (const stop of stops) {
    gradient.addColorStop(stop[0], stop[1]);
  }

  return gradient;
}

/*
 * Split text into lines without breaking Arabic words.
 * This runs only during generation, not on every keystroke.
 */
function wrapText(text, maxWidth, font) {
  ctx.font = font;

  const paragraphs = String(text || "").split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = "";

    for (const word of words) {
      const testLine = line ? line + " " + word : word;

      if (ctx.measureText(testLine).width <= maxWidth || !line) {
        line = testLine;
      } else {
        lines.push(line);
        line = word;
      }
    }

    if (line) {
      lines.push(line);
    }
  }

  return lines;
}

function fitTextLines(text, maxWidth, maxLines, startSize, minSize, weight = 800) {
  let size = startSize;
  let lines = [];

  while (size >= minSize) {
    const font = `${weight} ${size}px Cairo, sans-serif`;

    lines = wrapText(text, maxWidth, font);

    if (lines.length <= maxLines) {
      return { size, lines, font };
    }

    size -= 2;
  }

  size = minSize;

  const font = `${weight} ${size}px Cairo, sans-serif`;

  lines = wrapText(text, maxWidth, font);

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);

    const lastIndex = lines.length - 1;
    let last = lines[lastIndex];

    while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
      last = last.slice(0, -1);
    }

    lines[lastIndex] = last + "…";
  }

  return { size, lines, font };
}

function drawMultiline(text, x, y, maxWidth, options = {}) {
  const {
    size = 38,
    minSize = 24,
    maxLines = 4,
    weight = 800,
    color = "#fff",
    lineHeight = 1.65,
    align = "right",
    direction = "rtl"
  } = options;

  const result = fitTextLines(
    text,
    maxWidth,
    maxLines,
    size,
    minSize,
    weight
  );

  ctx.font = result.font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.direction = direction;

  result.lines.forEach((line, index) => {
    ctx.fillText(
      line,
      x,
      y + index * result.size * lineHeight,
      maxWidth
    );
  });

  return {
    lines: result.lines,
    size: result.size,
    height: result.lines.length * result.size * lineHeight
  };
}

function drawBackground(width, height, theme) {
  ctx.fillStyle = createGradient(
    0, 0, width, height,
    [
      [0, theme.bg1],
      [1, theme.bg2]
    ]
  );

  ctx.fillRect(0, 0, width, height);

  /*
   * Soft decorative glows.
   * Keep them simple for performance.
   */
  const glow1 = ctx.createRadialGradient(
    width * 0.88, height * 0.05, 0,
    width * 0.88, height * 0.05, width * 0.65
  );

  glow1.addColorStop(0, "rgba(50, 155, 180, 0.15)");
  glow1.addColorStop(1, "rgba(50, 155, 180, 0)");

  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(
    width * 0.05, height * 0.85, 0,
    width * 0.05, height * 0.85, width * 0.55
  );

  glow2.addColorStop(0, "rgba(150, 83, 240, 0.13)");
  glow2.addColorStop(1, "rgba(150, 83, 240, 0)");

  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);
}

function drawNeonLine(width, y, theme) {
  const gradient = createGradient(
    width * 0.08, y, width * 0.92, y,
    [
      [0, theme.purple],
      [0.5, theme.blue],
      [1, theme.cyan]
    ]
  );

  ctx.save();
  ctx.shadowColor = theme.cyan;
  ctx.shadowBlur = 12;
  fillRoundRect(ctx, width * 0.08, y, width * 0.84, 8, 5, gradient);
  ctx.restore();
}

function drawLogo(width, x, y, maxSize, theme) {
  if (logoReady && logoImage) {
    const ratio = logoImage.width / logoImage.height || 1;

    let w = maxSize;
    let h = w / ratio;

    if (h > maxSize) {
      h = maxSize;
      w = h * ratio;
    }

    ctx.drawImage(logoImage, x - w / 2, y - h / 2, w, h);
    return;
  }

  const text = "MISSION EDU";

  ctx.save();
  ctx.font = "900 26px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";

  const textWidth = ctx.measureText(text).width;

  ctx.fillStyle = theme.purple;
  ctx.fillText("MISSION", x - 36, y);

  ctx.fillStyle = "#f5d17b";
  ctx.fillText("EDU", x + textWidth * 0.23, y);

  ctx.restore();
}

function drawHeader(width, height, theme) {
  drawNeonLine(width, height * 0.075, theme);

  const titleX = width * 0.88;
  const titleY = height * 0.145;

  fillRoundRect(
    ctx,
    width * 0.62,
    height * 0.105,
    width * 0.28,
    height * 0.055,
    18,
    "rgba(193, 129, 255, 0.12)"
  );

  ctx.fillStyle = theme.purple;
  ctx.font = "800 28px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.fillText("سؤال وتحدّي", width * 0.76, titleY);

  const question = getData().question || "اكتب سؤالك هنا";

  drawMultiline(
    question,
    titleX,
    height * 0.235,
    width * 0.82,
    {
      size: Math.min(47, width * 0.044),
      minSize: 25,
      maxLines: 4,
      weight: 900,
      color: theme.text,
      lineHeight: 1.55
    }
  );
}

function drawOption(index, text, x, y, width, height, theme, correctIndex) {
  const palette = OPTION_COLORS[index];

  const isCorrect = correctIndex === index;
  const cardColor = isCorrect ? "#243b45" : theme.card;
  const borderColor = isCorrect ? theme.cyan : theme.cardBorder;

  ctx.save();

  /*
   * Subtle card shadow.
   */
  ctx.shadowColor = "rgba(0, 0, 0, 0.20)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;

  fillRoundRect(ctx, x, y, width, height, 23, cardColor);

  ctx.restore();

  strokeRoundRect(
    ctx,
    x,
    y,
    width,
    height,
    23,
    borderColor,
    isCorrect ? 3 : 2
  );

  const badgeSize = Math.min(70, height * 0.58);
  const badgeX = x + width - 38 - badgeSize;
  const badgeY = y + (height - badgeSize) / 2;

  fillRoundRect(
    ctx,
    badgeX,
    badgeY,
    badgeSize,
    badgeSize,
    17,
    palette.dark
  );

  ctx.fillStyle = palette.main;
  ctx.font = `900 ${Math.min(37, badgeSize * 0.55)}px Cairo, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";

  ctx.fillText(
    LETTERS[index],
    badgeX + badgeSize / 2,
    badgeY + badgeSize / 2 + 1
  );

  const textRight = badgeX - 30;
  const textLeft = x + 35;
  const availableWidth = Math.max(80, textRight - textLeft);
  const centerY = y + height / 2;

  drawMultiline(
    text || `الاختيار ${index + 1}`,
    textRight,
    centerY,
    availableWidth,
    {
      size: Math.min(32, height * 0.30),
      minSize: 18,
      maxLines: 2,
      weight: 700,
      color: theme.text,
      lineHeight: 1.45,
      align: "right"
    }
  );

  if (isCorrect) {
    const markX = x + 24;
    const markY = y + height / 2;

    ctx.fillStyle = theme.cyan;
    ctx.font = "800 18px Cairo, sans-serif";
    ctx.textAlign = "left";
    ctx.direction = "rtl";
    ctx.fillText("✓", markX, markY);
  }
}

function drawFooter(width, height, theme, watermark) {
  const footerY = height * 0.925;

  ctx.strokeStyle = "rgba(142, 160, 210, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, footerY - 30);
  ctx.lineTo(width * 0.92, footerY - 30);
  ctx.stroke();

  drawLogo(
    width,
    width * 0.17,
    footerY + 12,
    Math.min(38, width * 0.06),
    theme
  );

  ctx.fillStyle = theme.muted;
  ctx.font = "600 20px Cairo, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";

  ctx.fillText("تعلّم • تحدَّ • انتصر", width * 0.92, footerY + 12);

  if (watermark) {
    ctx.save();

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = theme.text;
    ctx.font = "900 27px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";

    ctx.fillText(watermark, width / 2, height * 0.87);

    ctx.restore();
  }
}

function getLayout(width, height) {
  const isLandscape = width > height;

  const left = width * 0.08;
  const cardWidth = width * 0.84;

  const headerBottom = isLandscape
    ? height * 0.39
    : height * 0.36;

  const footerTop = height * 0.87;

  const availableHeight = footerTop - headerBottom;
  const gap = Math.min(22, height * 0.018);

  const cardHeight = Math.max(
    70,
    Math.min(126, (availableHeight - gap * 3) / 4)
  );

  const totalHeight = cardHeight * 4 + gap * 3;
  const startY = headerBottom + Math.max(0, (availableHeight - totalHeight) / 2);

  return {
    left,
    cardWidth,
    startY,
    cardHeight,
    gap
  };
}

async function generateImage() {
  if (isGenerating) return;

  const data = getData();

  if (!data.question) {
    setStatus("اكتب السؤال الأول قبل توليد الصورة.", true);
    questionInput.focus();
    return;
  }

  const format = FORMATS[data.format] || FORMATS.square;
  const theme = THEMES[data.template] || THEMES.neon;

  isGenerating = true;
  generateBtn.disabled = true;
  generateBtn.textContent = "جاري التوليد...";

  setStatus("جاري تجهيز الصورة...");

  try {
    /*
     * Wait for the Arabic font and logo before drawing.
     */
    await Promise.all([
      document.fonts.ready,
      logoPromise
    ]);

    canvas.width = format.width;
    canvas.height = format.height;

    drawBackground(format.width, format.height, theme);
    drawHeader(format.width, format.height, theme);

    const layout = getLayout(format.width, format.height);
    const correctIndex = data.correct === "" ? -1 : Number(data.correct);

    data.options.forEach((option, index) => {
      const y = layout.startY + index * (layout.cardHeight + layout.gap);

      drawOption(
        index,
        option,
        layout.left,
        y,
        layout.cardWidth,
        layout.cardHeight,
        theme,
        correctIndex
      );
    });

    drawFooter(
      format.width,
      format.height,
      theme,
      data.watermark
    );

    hasGenerated = true;
    placeholder.classList.add("hidden");

    /*
     * Resize only the visible preview.
     * The actual canvas retains its full export resolution.
     */
    setStatus("تم توليد الصورة بنجاح. تقدر تنزّلها دلوقتي.");
  } catch (error) {
    console.error("Image generation failed:", error);
    setStatus("حصلت مشكلة أثناء توليد الصورة. جرّب تاني.", true);
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    generateBtn.innerHTML = "<span>✦</span> توليد الصورة";
  }
}

function downloadImage() {
  if (!hasGenerated) {
    setStatus("ولّد الصورة الأول قبل التنزيل.", true);
    return;
  }

  try {
    const link = document.createElement("a");
    link.download = "MISSION-EDU-Question.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    setStatus("بدأ تنزيل الصورة بجودة عالية.");
  } catch (error) {
    console.error("Image download failed:", error);
    setStatus("تعذّر تنزيل الصورة. حاول مرة أخرى.", true);
  }
}

/*
 * Generate only when requested.
 * Avoid redrawing the canvas on every keystroke to reduce lag.
 */
generateBtn.addEventListener("click", generateImage);
downloadBtn.addEventListener("click", downloadImage);

/*
 * Inform the user when edits have been made after generation.
 * No expensive drawing happens here.
 */
[
  questionInput,
  $("optionA"),
  $("optionB"),
  $("optionC"),
  $("optionD"),
  correctInput,
  watermarkInput,
  templateInput,
  formatInput
].forEach((element) => {
  element.addEventListener("input", () => {
    if (hasGenerated) {
      setStatus("تم تعديل البيانات. اضغط توليد الصورة لتحديث المعاينة.");
    }
  });

  element.addEventListener("change", () => {
    if (hasGenerated) {
      setStatus("تم تعديل الإعدادات. اضغط توليد الصورة لتحديث المعاينة.");
    }
  });
});

/*
 * Wait for fonts and logo to load once.
 */
Promise.all([document.fonts.ready, logoPromise]).then(() => {
  setStatus("جاهز! اكتب السؤال واضغط على توليد الصورة.");
});