(() => {
    const $ = id => document.getElementById(id);
    const canvas = $("previewCanvas");
    const ctx = canvas.getContext("2d");

    const optionIds = ["optionA", "optionB", "optionC", "optionD"];
    const letters = ["أ", "ب", "ج", "د"];

    let theme = "neon";

    const themes = {
        neon: {
            bg: "#090b18",
            card: "#12162b",
            border: "#34315b",
            text: "#f7f7ff",
            muted: "#a1a8c8",
            accent: "#9a78ff",
            accent2: "#50d6ff",
            option: "#1b203b",
            optionBorder: "#333b62",
            correct: "#123e35",
            correctBorder: "#43e8b3",
            correctText: "#76f6cc"
        },

        paper: {
            bg: "#f1f4fa",
            card: "#ffffff",
            border: "#d8dfec",
            text: "#17243e",
            muted: "#66748e",
            accent: "#274d83",
            accent2: "#4e76a8",
            option: "#f6f8fc",
            optionBorder: "#dce3ef",
            correct: "#e0f6ec",
            correctBorder: "#22996f",
            correctText: "#116e4e"
        },

        aurora: {
            bg: "#101329",
            card: "#171c35",
            border: "#35446a",
            text: "#f7fbff",
            muted: "#b0bad4",
            accent: "#bb86ff",
            accent2: "#55e5d2",
            option: "#202945",
            optionBorder: "#3d4d70",
            correct: "#173f3b",
            correctBorder: "#56e7c5",
            correctText: "#8affdf"
        }
    };

    function roundedRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function wrapText(text, maxWidth, font) {
        ctx.font = font;

        const words = String(text || "").trim().split(/\s+/).filter(Boolean);
        if (!words.length) return [""];

        const lines = [];
        let line = "";

        for (const word of words) {
            const test = line ? line + " " + word : word;

            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = test;
            }
        }

        if (line) lines.push(line);

        return lines;
    }

    function drawLines(text, x, y, maxWidth, font, color, lineHeight) {
        const lines = wrapText(text, maxWidth, font);

        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";

        lines.forEach((line, index) => {
            ctx.fillText(line, x, y + index * lineHeight, maxWidth);
        });

        return lines.length * lineHeight;
    }

    function getCorrect() {
        const selected = document.querySelector(
            'input[name="correct"]:checked'
        );

        return selected ? selected.value : "";
    }

    function drawWatermark(t) {
        const enabled = $("watermarkToggle").checked;
        const label = $("watermark").value.trim();

        if (!enabled || !label) return;

        ctx.save();

        ctx.globalAlpha = theme === "paper" ? 0.055 : 0.075;
        ctx.fillStyle = t.text;
        ctx.font = "900 54px Cairo, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.translate(540, 540);
        ctx.rotate(-Math.PI / 5);

        for (let y = -900; y <= 900; y += 210) {
            for (let x = -900; x <= 900; x += 500) {
                ctx.fillText(label, x, y);
            }
        }

        ctx.restore();
    }

    function draw() {
        const t = themes[theme];
        const question = $("question").value.trim();
        const options = optionIds.map(id => $(id).value.trim());
        const correct = getCorrect();

        ctx.clearRect(0, 0, 1080, 1080);

        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, 1080, 1080);

        if (theme !== "paper") {
            const glow = ctx.createRadialGradient(
                860, 80, 10, 860, 80, 600
            );

            glow.addColorStop(
                0,
                theme === "aurora" ? "#1b8d9b44" : "#7348df44"
            );

            glow.addColorStop(1, "#090b1800");

            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, 1080, 1080);
        }

        drawWatermark(t);

        // بطاقة السؤال
        ctx.save();
        ctx.shadowColor = theme === "paper" ? "#15284a10" : "#0008";
        ctx.shadowBlur = 35;
        ctx.shadowOffsetY = 15;

        roundedRect(76, 64, 928, 952, 34);
        ctx.fillStyle = t.card;
        ctx.fill();

        ctx.restore();

        roundedRect(76, 64, 928, 952, 34);
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 2;
        ctx.stroke();

        // الشريط العلوي
        const gradient = ctx.createLinearGradient(130, 0, 950, 0);
        gradient.addColorStop(0, t.accent);
        gradient.addColorStop(1, t.accent2);

        roundedRect(130, 112, 820, 7, 4);
        ctx.fillStyle = gradient;
        ctx.fill();

        // شارة السؤال
        roundedRect(730, 151, 220, 52, 15);
        ctx.fillStyle = theme === "paper" ? "#edf2fb" : "#252343";
        ctx.fill();

        ctx.font = "800 21px Cairo, sans-serif";
        ctx.fillStyle = t.accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("سؤال وتحدّي", 840, 177);

        // نص السؤال
        const questionText = question || "اكتب نص السؤال ليظهر هنا";
        let questionFont = 38;

        if (
            wrapText(questionText, 810, "800 38px Cairo, sans-serif").length > 4
        ) {
            questionFont = 30;
        }

        const questionHeight = drawLines(
            questionText,
            930,
            237,
            810,
            `800 ${questionFont}px Cairo, sans-serif`,
            t.text,
            questionFont + 21
        );

        // مساحة الاختيارات تتكيف مع طول السؤال
        const optionStart = Math.max(390, 237 + questionHeight + 40);
        const visibleOptions = options
            .map((value, index) => ({ value, index }))
            .filter(item => item.value);

        const availableHeight = 870 - optionStart;
        const count = Math.max(visibleOptions.length, 1);

        let rowHeight = Math.min(
            112,
            Math.floor((availableHeight - (count - 1) * 14) / count)
        );

        rowHeight = Math.max(65, rowHeight);

        let y = optionStart;

        visibleOptions.forEach(({ value, index }) => {
            const key = ["A", "B", "C", "D"][index];
            const isCorrect = correct === key;

            roundedRect(130, y, 820, rowHeight, 19);

            ctx.fillStyle = isCorrect ? t.correct : t.option;
            ctx.fill();

            ctx.strokeStyle = isCorrect
                ? t.correctBorder
                : t.optionBorder;

            ctx.lineWidth = isCorrect ? 3 : 2;
            ctx.stroke();

            // مربع حرف الاختيار
            roundedRect(
                855,
                y + (rowHeight - 48) / 2,
                60,
                48,
                13
            );

            ctx.fillStyle = isCorrect
                ? t.correctBorder
                : (theme === "paper" ? "#e4ebf7" : "#303052");

            ctx.fill();

            ctx.font = "800 24px Cairo, sans-serif";
            ctx.fillStyle = isCorrect
                ? (theme === "paper" ? "#ffffff" : "#06241c")
                : t.accent2;

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(letters[index], 885, y + rowHeight / 2);

            // نص الاختيار
            const fontSize = rowHeight < 85 ? 20 : 25;
            const font = `600 ${fontSize}px Cairo, sans-serif`;
            const lineHeight = fontSize + 9;

            const lines = wrapText(value, 660, font);
            const maxLines = Math.max(
                1,
                Math.floor((rowHeight - 14) / lineHeight)
            );

            const displayedLines = lines.slice(0, maxLines);

            ctx.font = font;
            ctx.fillStyle = isCorrect ? t.correctText : t.text;
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";

            const firstY =
                y + rowHeight / 2 -
                ((displayedLines.length - 1) * lineHeight) / 2;

            displayedLines.forEach((line, i) => {
                ctx.fillText(line, 825, firstY + i * lineHeight, 660);
            });

            if (isCorrect) {
                ctx.font = "700 17px Arial";
                ctx.fillStyle = t.correctText;
                ctx.textAlign = "left";
                ctx.fillText("✓", 155, y + rowHeight / 2);
            }

            y += rowHeight + 14;
        });

        // التذييل داخل الصورة
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(130, 945);
        ctx.lineTo(950, 945);
        ctx.stroke();

        ctx.font = "800 19px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        ctx.fillStyle = t.accent;
        ctx.fillText("MISSION", 130, 975);

        ctx.fillStyle = theme === "paper" ? "#b18120" : "#f1ce77";
        ctx.fillText("EDU", 222, 975);

        ctx.font = "500 15px Cairo, sans-serif";
        ctx.fillStyle = t.muted;
        ctx.textAlign = "right";
        ctx.fillText("تعلّم • تحدَّ • انتصر", 950, 975);
    }

    function updateCounter() {
        $("questionCount").textContent =
            `${$("question").value.length} / 600`;
    }

    function message(text, error = false) {
        $("formMessage").textContent = text;
        $("formMessage").style.color = error ? "#ff8da6" : "#63e7b7";
    }

    $("questionForm").addEventListener("submit", event => {
        event.preventDefault();

        if (!$("question").value.trim()) {
            message("اكتب نص السؤال أولًا.", true);
            $("question").focus();
            return;
        }

        draw();
        message("تم توليد الصورة بنجاح، يمكنك تحميلها الآن.");
    });

    $("downloadBtn").addEventListener("click", () => {
        if (!$("question").value.trim()) {
            message("اكتب نص السؤال أولًا ثم اضغط توليد الصورة.", true);
            $("question").focus();
            return;
        }

        draw();

        canvas.toBlob(blob => {
            if (!blob) {
                message("تعذّر إنشاء الصورة. جرّب متصفحًا أحدث.", true);
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "mission-edu-question.png";
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            message("بدأ تحميل صورة PNG.");
        }, "image/png");
    });

    $("clearCorrect").addEventListener("click", () => {
        document.querySelectorAll('input[name="correct"]')
            .forEach(input => input.checked = false);

        draw();
    });

    $("watermarkToggle").addEventListener("change", draw);

    document.querySelectorAll(".theme-card").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".theme-card")
                .forEach(item => item.classList.remove("active"));

            button.classList.add("active");
            theme = button.dataset.theme;
            draw();
        });
    });

    $("resetBtn").addEventListener("click", () => {
        $("question").value = "";

        optionIds.forEach(id => $(id).value = "");

        $("watermark").value = "";
        $("watermarkToggle").checked = false;

        document.querySelectorAll('input[name="correct"]')
            .forEach(input => input.checked = false);

        updateCounter();
        draw();
        message("تمت إعادة ضبط الحقول.");
    });

    ["question", ...optionIds, "watermark"].forEach(id => {
        $(id).addEventListener("input", () => {
            if (id === "question") updateCounter();
            draw();
        });
    });

    document.querySelectorAll('input[name="correct"]')
        .forEach(input => input.addEventListener("change", draw));

    // تحميل الخط العربي قبل رسم المعاينة
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            updateCounter();
            draw();
        });
    } else {
        updateCounter();
        draw();
    }
})();