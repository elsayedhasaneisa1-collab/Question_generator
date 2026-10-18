"use strict";

const canvas = document.getElementById("questionCanvas");
const ctx = canvas.getContext("2d");

const form = document.getElementById("questionForm");
const questionInput = document.getElementById("question");
const questionCount = document.getElementById("questionCount");
const correctAnswerInput = document.getElementById("correctAnswer");
const watermarkInput = document.getElementById("watermark");
const imageSizeInput = document.getElementById("imageSize");
const downloadButton = document.getElementById("downloadButton");
const generateButton = document.getElementById("generateButton");
const resetButton = document.getElementById("resetButton");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const toast = document.getElementById("toast");

let selectedTemplate = "neon";
let imageGenerated = false;
let toastTimer = null;

document.getElementById("currentYear").textContent =
new Date().getFullYear();

questionInput.addEventListener("input", () => {
questionCount.textContent = "${questionInput.value.length} / 1200";
});

document.querySelectorAll(".template-card").forEach((button) => {
button.addEventListener("click", () => {
document.querySelectorAll(".template-card").forEach((card) => {
card.classList.remove("active");
});

button.classList.add("active");
selectedTemplate = button.dataset.template;

if (imageGenerated) {
  generateImage(false);
}

});
});

imageSizeInput.addEventListener("change", () => {
if (imageGenerated) {
generateImage(false);
}
});

form.addEventListener("submit", (event) => {
event.preventDefault();

if (!form.reportValidity()) {
return;
}

generateImage(true);
});

resetButton.addEventListener("click", () => {
const shouldReset = window.confirm("هل تريد مسح السؤال والاختيارات؟");

if (!shouldReset) return;

form.reset();

selectedTemplate = "neon";

document.querySelectorAll(".template-card").forEach((card) => {
card.classList.toggle("active", card.dataset.template === "neon");
});

questionCount.textContent = "0 / 1200";
imageGenerated = false;

canvas.style.display = "none";
previewPlaceholder.style.display = "block";
downloadButton.disabled = true;

canvas.width = 1080;
canvas.height = 1080;

showToast("تم مسح البيانات.");
});

downloadButton.addEventListener("click", () => {
if (!imageGenerated) {
showToast("أنشئ الصورة أولًا.");
return;
}

canvas.toBlob((blob) => {
if (!blob) {
showToast("حصلت مشكلة أثناء تجهيز الصورة.");
return;
}

const objectURL = URL.createObjectURL(blob);
const link = document.createElement("a");

link.href = objectURL;
link.download = `mission-edu-question-${Date.now()}.png`;

document.body.appendChild(link);
link.click();
link.remove();

setTimeout(() => URL.revokeObjectURL(objectURL), 1500);

showToast("تم تجهيز الصورة للتنزيل.");

}, "image/png");
});

function getQuestionData() {
return {
question: questionInput.value.trim(),
options: [
document.getElementById("optionA").value.trim(),
document.getElementById("optionB").value.trim(),
document.getElementById("optionC").value.trim(),
document.getElementById("optionD").value.trim()
],
correct: correctAnswerInput.value,
watermark: watermarkInput.value.trim()
};
}

function getDimensions() {
switch (imageSizeInput.value) {
case "story":
return { width: 1080, height: 1920 };

case "landscape":
  return { width: 1200, height: 675 };

default:
  return { width: 1080, height: 1080 };

}
}

function generateImage(showMessage = true) {
const data = getQuestionData();

if (!data.question) {
showToast("اكتب نص السؤال أولًا.");
questionInput.focus();
return;
}

if (data.options.some((option) => !option)) {
showToast("اكتب الاختيارات الأربعة.");
return;
}

const dimensions = getDimensions();

canvas.width = dimensions.width;
canvas.height = dimensions.height;

drawBackground(dimensions.width, dimensions.height);
drawHeader(dimensions.width);

const isStory = dimensions.height > dimensions.width;
const isLandscape = dimensions.width > dimensions.height;

const sidePadding = isLandscape ? 76 : 78;
const contentWidth = dimensions.width - sidePadding * 2;

const questionTop = isStory ? 310 : isLandscape ? 150 : 255;
const questionFont = isStory ? 45 : isLandscape ? 42 : 48;

const questionLines = wrapText(
data.question,
contentWidth - 75,
questionFont,
700
);

const questionLineHeight = questionFont * 1.65;
const questionBoxHeight = Math.max(
175,
questionLines.length * questionLineHeight + 75
);

drawRoundedRect(
sidePadding,
questionTop,
contentWidth,
questionBoxHeight,
28,
getCardColor()
);

drawRoundedRect(
sidePadding + contentWidth - 9,
questionTop + 20,
6,
questionBoxHeight - 40,
3,
getAccentColor()
);

ctx.save();
ctx.textAlign = "right";
ctx.textBaseline = "top";
ctx.fillStyle = getTextColor();
ctx.font = "700 ${questionFont}px Cairo, sans-serif";

let questionY = questionTop + 34;

questionLines.forEach((line) => {
ctx.fillText(
line,
dimensions.width - sidePadding - 38,
questionY,
contentWidth - 90
);

questionY += questionLineHeight;

});

ctx.restore();

const optionGap = isStory ? 23 : 18;
const optionFont = isStory ? 35 : isLandscape ? 29 : 34;
const optionPadding = isStory ? 29 : 25;
const optionTop = questionTop + questionBoxHeight + (isStory ? 55 : 40);

const availableBottom = data.watermark
? dimensions.height - (isStory ? 180 : 110)
: dimensions.height - (isStory ? 100 : 65);

const availableOptionsHeight =
availableBottom - optionTop - optionGap * 3;

let optionHeight = Math.min(
isStory ? 155 : 125,
availableOptionsHeight / 4
);

optionHeight = Math.max(70, optionHeight);

data.options.forEach((option, index) => {
const y = optionTop + index * (optionHeight + optionGap);
const key = ["A", "B", "C", "D"][index];
const isCorrect = data.correct === key;

drawOptionCard({
  x: sidePadding,
  y,
  width: contentWidth,
  height: optionHeight,
  text: option,
  letter: ["أ", "ب", "ج", "د"][index],
  index,
  isCorrect,
  fontSize: optionFont,
  padding: optionPadding
});

});

drawFooter(dimensions.width, dimensions.height, data.watermark);

canvas.style.display = "block";
previewPlaceholder.style.display = "none";
downloadButton.disabled = false;
imageGenerated = true;

if (showMessage) {
showToast("تم إنشاء الصورة بنجاح!");
}
}

function drawBackground(width, height) {
const gradient = ctx.createLinearGradient(0, 0, width, height);

if (selectedTemplate === "paper") {
gradient.addColorStop(0, "#f5f0e5");
gradient.addColorStop(0.55, "#e8edf7");
gradient.addColorStop(1, "#d8e3f2");
} else if (selectedTemplate === "aurora") {
gradient.addColorStop(0, "#0c253e");
gradient.addColorStop(0.48, "#39245e");
gradient.addColorStop(1, "#173e55");
} else {
gradient.addColorStop(0, "#090d20");
gradient.addColorStop(0.55, "#121638");
gradient.addColorStop(1, "#101d37");
}

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

if (selectedTemplate === "paper") {
drawPaperPattern(width, height);
} else {
drawNeonEffects(width, height);
}

drawRoundedRect(
16,
16,
width - 32,
height - 32,
30,
"rgba(0,0,0,0)"
);

ctx.strokeStyle = selectedTemplate === "paper"
? "rgba(37, 60, 95, 0.17)"
: "rgba(145, 160, 255, 0.25)";

ctx.lineWidth = 2;
ctx.strokeRect(22, 22, width - 44, height - 44);
}

function drawNeonEffects(width, height) {
const circles = [
{
x: width * 0.88,
y: height * 0.09,
radius: width * 0.24,
color: selectedTemplate === "aurora" ? "#f05fa8" : "#8d43ff"
},
{
x: width * 0.08,
y: height * 0.87,
radius: width * 0.25,
color: selectedTemplate === "aurora" ? "#36e5d3" : "#167eff"
}
];

circles.forEach((circle) => {
const gradient = ctx.createRadialGradient(
circle.x,
circle.y,
0,
circle.x,
circle.y,
circle.radius
);

gradient.addColorStop(0, hexToRgba(circle.color, 0.23));
gradient.addColorStop(1, hexToRgba(circle.color, 0));

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

});

ctx.save();
ctx.strokeStyle = "rgba(145, 160, 255, 0.06)";
ctx.lineWidth = 1;

const gridSize = 54;

for (let x = 0; x <= width; x += gridSize) {
ctx.beginPath();
ctx.moveTo(x, 0);
ctx.lineTo(x, height);
ctx.stroke();
}

for (let y = 0; y <= height; y += gridSize) {
ctx.beginPath();
ctx.moveTo(0, y);
ctx.lineTo(width, y);
ctx.stroke();
}

ctx.restore();
}

function drawPaperPattern(width, height) {
ctx.save();

ctx.strokeStyle = "rgba(45, 68, 100, 0.07)";
ctx.lineWidth = 1;

for (let y = 45; y < height; y += 42) {
ctx.beginPath();
ctx.moveTo(30, y);
ctx.lineTo(width - 30, y);
ctx.stroke();
}

ctx.restore();
}

function drawHeader(width) {
const centerX = width / 2;

const logoSize = Math.min(85, width * 0.085);
const logoY = 60;

ctx.save();
ctx.textAlign = "center";
ctx.textBaseline = "middle";

ctx.font = "900 ${Math.min(38, width * 0.036)}px Cairo, sans-serif";
ctx.fillStyle = getTextColor();

ctx.fillText("MISSION EDU", centerX, logoY + logoSize + 22);

ctx.font = "500 ${Math.min(22, width * 0.02)}px Cairo, sans-serif";
ctx.fillStyle = selectedTemplate === "paper"
? "#52627e"
: "#a9b3d6";

ctx.fillText("تعلّم • تحدَّ • انتصر", centerX, logoY + logoSize + 62);

ctx.restore();

// لا يتم تضمين صورة اللوجو داخل Canvas تلقائيًا؛
// يتم رسم اسم المنصة حتى يظل التوليد مستقلًا عن تحميل الصور الخارجية.
}

function drawOptionCard({
x,
y,
width,
height,
text,
letter,
index,
isCorrect,
fontSize,
padding
}) {
const cardColor = selectedTemplate === "paper"
? "rgba(255, 255, 255, 0.72)"
: "rgba(14, 20, 43, 0.78)";

drawRoundedRect(
x,
y,
width,
height,
22,
isCorrect
? selectedTemplate === "paper"
? "rgba(33, 153, 105, 0.16)"
: "rgba(43, 211, 151, 0.16)"
: cardColor
);

ctx.save();

ctx.strokeStyle = isCorrect
? "#42dfa8"
: selectedTemplate === "paper"
? "rgba(61, 83, 115, 0.19)"
: "rgba(145, 160, 255, 0.17)";

ctx.lineWidth = isCorrect ? 4 : 2;

roundedPath(x, y, width, height, 22);
ctx.stroke();

const circleSize = Math.min(61, height * 0.58);
const circleX = x + width - padding - circleSize / 2;
const circleY = y + height / 2;

ctx.beginPath();
ctx.arc(circleX, circleY, circleSize / 2, 0, Math.PI * 2);

const optionColors = ["#9b5cff", "#477dff", "#16b995", "#e96b9c"];

ctx.fillStyle = isCorrect
? "#21b98b"
: selectedTemplate === "paper"
? ["#e6d8ff", "#d8e6ff", "#d3f5e9", "#f8dce8"][index]
: hexToRgba(optionColors[index], 0.22);

ctx.fill();

ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillStyle = isCorrect
? "#ffffff"
: selectedTemplate === "paper"
? ["#7040b7", "#2b5fb8", "#128a70", "#b34370"][index]
: "#ffffff";

ctx.font = "900 ${Math.min(30, circleSize * 0.48)}px Cairo, sans-serif";
ctx.fillText(letter, circleX, circleY + 1);

const textRight = circleX - circleSize / 2 - 22;
const textLeft = x + padding;
const maxTextWidth = textRight - textLeft;

const textLines = wrapText(text, maxTextWidth, fontSize, 700);
const lineHeight = fontSize * 1.42;
const maxLines = Math.max(
1,
Math.floor((height - 20) / lineHeight)
);

const visibleLines = textLines.slice(0, maxLines);
const totalTextHeight = visibleLines.length * lineHeight;

let textY = y + (height - totalTextHeight) / 2 + lineHeight / 2;

ctx.textAlign = "right";
ctx.textBaseline = "middle";
ctx.fillStyle = selectedTemplate === "paper" ? "#24334b" : "#f2f5ff";
ctx.font = "700 ${fontSize}px Cairo, sans-serif";

visibleLines.forEach((line) => {
ctx.fillText(line, textRight, textY, maxTextWidth);
textY += lineHeight;
});

if (isCorrect) {
ctx.textAlign = "left";
ctx.textBaseline = "top";
ctx.fillStyle = "#42dfa8";
ctx.font = "700 17px Cairo, sans-serif";
ctx.fillText("✓", x + 17, y + 10);
}

ctx.restore();
}

function drawFooter(width, height, watermark) {
ctx.save();
ctx.textAlign = "center";
ctx.textBaseline = "middle";

if (watermark) {
ctx.fillStyle = selectedTemplate === "paper"
? "rgba(40, 56, 84, 0.68)"
: "rgba(220, 227, 255, 0.65)";

ctx.font = `700 ${Math.min(25, width * 0.023)}px Cairo, sans-serif`;
ctx.fillText(watermark, width / 2, height - 65, width - 100);

} else {
ctx.fillStyle = selectedTemplate === "paper"
? "rgba(40, 56, 84, 0.45)"
: "rgba(220, 227, 255, 0.45)";

ctx.font = `600 ${Math.min(20, width * 0.019)}px Cairo, sans-serif`;
ctx.fillText("MISSION EDU", width / 2, height - 45);

}

ctx.restore();
}

function drawRoundedRect(x, y, width, height, radius, fillColor) {
roundedPath(x, y, width, height, radius);

if (fillColor !== "rgba(0,0,0,0)") {
ctx.fillStyle = fillColor;
ctx.fill();
}
}

function roundedPath(x, y, width, height, radius) {
const r = Math.min(radius, width / 2, height / 2);

ctx.beginPath();
ctx.moveTo(x + r, y);
ctx.lineTo(x + width - r, y);
ctx.quadraticCurveTo(x + width, y, x + width, y + r);
ctx.lineTo(x + width, y + height - r);
ctx.quadraticCurveTo(
x + width,
y + height,
x + width - r,
y + height
);
ctx.lineTo(x + r, y + height);
ctx.quadraticCurveTo(x, y + height, x, y + height - r);
ctx.lineTo(x, y + r);
ctx.quadraticCurveTo(x, y, x + r, y);
ctx.closePath();
}

function wrapText(text, maxWidth, fontSize, fontWeight = 700) {
ctx.save();
ctx.font = "${fontWeight} ${fontSize}px Cairo, sans-serif";

const paragraphs = String(text).split("\n");
const lines = [];

paragraphs.forEach((paragraph) => {
const words = paragraph.split(/\s+/).filter(Boolean);

if (!words.length) {
  lines.push("");
  return;
}

let currentLine = "";

words.forEach((word) => {
  let candidate = currentLine ? `${currentLine} ${word}` : word;

  if (ctx.measureText(candidate).width <= maxWidth) {
    currentLine = candidate;
    return;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (ctx.measureText(word).width <= maxWidth) {
    currentLine = word;
    return;
  }

  let part = "";

  for (const character of word) {
    const nextPart = part + character;

    if (
      ctx.measureText(nextPart).width > maxWidth &&
      part
    ) {
      lines.push(part);
      part = character;
    } else {
      part = nextPart;
    }
  }

  currentLine = part;
});

if (currentLine) {
  lines.push(currentLine);
}

});

ctx.restore();

return lines.length ? lines : [""];
}

function getCardColor() {
return selectedTemplate === "paper"
? "rgba(255, 255, 255, 0.82)"
: selectedTemplate === "aurora"
? "rgba(17, 31, 59, 0.78)"
: "rgba(16, 22, 49, 0.86)";
}

function getAccentColor() {
if (selectedTemplate === "paper") return "#477dff";
if (selectedTemplate === "aurora") return "#d16aff";
return "#9b5cff";
}

function getTextColor() {
return selectedTemplate === "paper" ? "#24334b" : "#f3f5ff";
}

function hexToRgba(hex, alpha) {
const normalized = hex.replace("#", "");

const bigint = parseInt(normalized, 16);
const red = (bigint >> 16) & 255;
const green = (bigint >> 8) & 255;
const blue = bigint & 255;

return "rgba(${red}, ${green}, ${blue}, ${alpha})";
}

function showToast(message) {
toast.textContent = message;
toast.classList.add("show");

clearTimeout(toastTimer);

toastTimer = setTimeout(() => {
toast.classList.remove("show");
}, 2800);
}