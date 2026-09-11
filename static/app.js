(() => {
  // Elements
  const entry = document.getElementById('entry');
  const count = document.getElementById('count');
  const wordMetric = document.getElementById('wordMetric');
  const submitBtn = document.getElementById('submit');
  const clearBtn = document.getElementById('clearBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const voiceBtnLabel = document.getElementById('voiceBtnLabel');
  const errorEl = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');

  const readingEl = document.getElementById('reading');
  const spectrumEl = document.getElementById('spectrum');
  const spectrumBreakdown = document.getElementById('spectrumBreakdown');
  const resultEmoji = document.getElementById('resultEmoji');
  const resultEmotion = document.getElementById('resultEmotion');
  const resultConfidence = document.getElementById('resultConfidence');
  const resultQuote = document.getElementById('resultQuote');
  const secondaryTone = document.getElementById('secondaryTone');
  const secondaryName = document.getElementById('secondaryName');
  const secondaryPct = document.getElementById('secondaryPct');
  const ambientGlow = document.getElementById('ambientGlow');

  const modelStatus = document.getElementById('modelStatus');
  const statusLabel = document.getElementById('statusLabel');

  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const historyDrawer = document.getElementById('historyDrawer');
  const historyBackdrop = document.getElementById('historyBackdrop');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const emptyHistory = document.getElementById('emptyHistory');
  const historyCountBadge = document.getElementById('historyCountBadge');

  const copyBtn = document.getElementById('copyBtn');
  const resetBtn = document.getElementById('resetBtn');
  const toast = document.getElementById('toast');
  const sampleChips = document.querySelectorAll('.sample-chip');

  // Emotion Definitions & Literary Reflections
  const EMOTIONS = {
    sadness: {
      emoji: '😢',
      color: '--sadness',
      hex: '#4f86f7',
      glow: 'rgba(79, 134, 247, 0.22)',
      quote: "There's some weight in this one. It's okay to sit with it for a moment."
    },
    joy: {
      emoji: '😊',
      color: '--joy',
      hex: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.22)',
      quote: 'Something in this is lifting you up — that radiant lightness comes through clearly.'
    },
    love: {
      emoji: '❤️',
      color: '--love',
      hex: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.22)',
      quote: 'This one is written toward someone. That gentle warmth is impossible to disguise.'
    },
    anger: {
      emoji: '😡',
      color: '--anger',
      hex: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.22)',
      quote: "There's sharp heat here. Whatever provoked this, it genuinely matters to you."
    },
    fear: {
      emoji: '😨',
      color: '--fear',
      hex: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.22)',
      quote: "This carries genuine unease — like standing on edge, bracing for an unknown turn."
    },
    surprise: {
      emoji: '😲',
      color: '--surprise',
      hex: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.22)',
      quote: 'This caught you completely off guard, and the wonder still resonates through the words.'
    }
  };

  const ORDER = ['joy', 'love', 'surprise', 'sadness', 'fear', 'anger'];
  const HISTORY_KEY = 'reader_readings_history';
  let currentReadingData = null;

  // Toast Notification
  let toastTimer = null;
  const showToast = (msg) => {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2400);
  };

  // Base URL for API requests:
  // When running directly from FastAPI backend (port 8000), use relative paths ('').
  // When served via Live Server (port 5500, 5501, etc.) or file://, target http://127.0.0.1:8000.
  const API_BASE = (window.location.port !== '8000' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:'))
    ? 'http://127.0.0.1:8000'
    : '';

  // Health Check
  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.model_loaded) {
          modelStatus.classList.add('is-ready');
          modelStatus.classList.remove('is-error');
          statusLabel.textContent = 'Engine Online';
          return true;
        }
      }
    } catch (e) {
      // Backend is loading or unavailable
    }
    modelStatus.classList.remove('is-ready');
    statusLabel.textContent = 'Engine Standby';
    return false;
  };

  // Metrics & Clear Button State
  const updateMetrics = () => {
    const text = entry.value;
    count.textContent = text.length;

    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    wordMetric.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;

    clearBtn.hidden = text.length === 0;
  };

  const clearText = () => {
    entry.value = '';
    updateMetrics();
    entry.focus();
    clearError();
  };

  // Error Display
  const showError = (msg) => {
    errorMessage.textContent = msg;
    errorEl.hidden = false;
  };

  const clearError = () => {
    errorEl.hidden = true;
  };

  // Loading State
  const setLoading = (isLoading) => {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('is-loading', isLoading);
    submitBtn.querySelector('.submit-label').textContent = isLoading ? 'Listening…' : 'Read this';
  };

  // History / Journal Management
  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  };

  const saveToHistory = (item) => {
    const list = getHistory();
    // Avoid exact duplicate consecutive entry
    if (list.length && list[0].text === item.text) return;

    list.unshift({
      id: Date.now(),
      text: item.text,
      emotion: item.predicted_emotion,
      confidence: item.confidence,
      all_probabilites: item.all_probabilites,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (list.length > 15) list.pop();
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) {}
    renderHistory();
  };

  const renderHistory = () => {
    const list = getHistory();
    historyCountBadge.textContent = list.length;

    if (list.length === 0) {
      emptyHistory.hidden = false;
      historyList.innerHTML = '';
      return;
    }

    emptyHistory.hidden = true;
    historyList.innerHTML = '';

    list.forEach((item) => {
      const meta = EMOTIONS[item.emotion] || EMOTIONS.joy;
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="history-item-top">
          <span class="history-item-badge" style="color:var(${meta.color})">
            ${meta.emoji} ${item.emotion} · ${Math.round(item.confidence * 100)}%
          </span>
          <span class="history-item-time">${item.time || ''}</span>
        </div>
        <p class="history-item-text">${escapeHtml(item.text)}</p>
      `;

      el.addEventListener('click', () => {
        entry.value = item.text;
        updateMetrics();
        renderResult(item, false);
        closeHistoryDrawer();
        window.scrollTo({ top: readingEl.offsetTop - 80, behavior: 'smooth' });
        showToast(`Loaded "${item.emotion}" reading`);
      });

      historyList.appendChild(el);
    });
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const openHistoryDrawer = () => {
    renderHistory();
    historyDrawer.classList.add('is-open');
    historyBackdrop.classList.add('is-open');
  };

  const closeHistoryDrawer = () => {
    historyDrawer.classList.remove('is-open');
    historyBackdrop.classList.remove('is-open');
  };

  // Voice Dictation (Speech Recognition)
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    voiceBtn.hidden = false;
    let recognition = null;
    let isListening = false;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('is-active');
        voiceBtnLabel.textContent = 'Listening…';
        showToast('Microphone active. Speak your sentence…');
      };

      recognition.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((res) => res[0].transcript)
          .join('');
        entry.value = transcript;
        updateMetrics();
      };

      recognition.onerror = (e) => {
        voiceBtn.classList.remove('is-active');
        voiceBtnLabel.textContent = 'Voice';
        isListening = false;
        if (e.error !== 'no-speech') {
          showError(`Voice error: ${e.error}`);
        }
      };

      recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('is-active');
        voiceBtnLabel.textContent = 'Voice';
      };

      voiceBtn.addEventListener('click', () => {
        if (isListening) {
          recognition.stop();
        } else {
          clearError();
          recognition.start();
        }
      });
    } catch (e) {
      voiceBtn.hidden = true;
    }
  };

  // Render Visual Breakdown & Spectrum
  const renderSpectrumAndBars = (probabilities, topEmotion) => {
    spectrumEl.innerHTML = '';
    spectrumBreakdown.innerHTML = '';

    // Sort emotions by probability descending
    const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);

    // 1. Render Segmented Horizon Ribbon
    ORDER.forEach((label) => {
      const prob = probabilities[label] ?? 0;
      const pct = prob * 100;
      const meta = EMOTIONS[label];

      const seg = document.createElement('div');
      seg.className = 'spectrum-seg';
      seg.style.background = `var(${meta.color})`;
      seg.title = `${label}: ${pct.toFixed(1)}%`;
      spectrumEl.appendChild(seg);

      requestAnimationFrame(() => {
        seg.style.width = `${pct}%`;
      });
    });

    // 2. Render Individual Breakdown Progress Cards
    sorted.forEach(([label, prob]) => {
      const pct = (prob * 100).toFixed(1);
      const meta = EMOTIONS[label] || EMOTIONS.joy;
      const isTop = label === topEmotion;

      const card = document.createElement('div');
      card.className = `breakdown-card ${isTop ? 'is-top' : ''}`;
      card.innerHTML = `
        <div class="breakdown-header">
          <div class="breakdown-label-group">
            <span class="breakdown-emoji">${meta.emoji}</span>
            <span class="breakdown-name">${label}</span>
          </div>
          <span class="breakdown-pct">${pct}%</span>
        </div>
        <div class="breakdown-track">
          <div class="breakdown-bar" style="background:var(${meta.color})"></div>
        </div>
      `;

      spectrumBreakdown.appendChild(card);

      const bar = card.querySelector('.breakdown-bar');
      requestAnimationFrame(() => {
        bar.style.width = `${pct}%`;
      });
    });

    // 3. Secondary Tone detection (runner-up if meaningful)
    if (sorted.length > 1 && sorted[1][1] >= 0.08) {
      const secondLabel = sorted[1][0];
      const secondProb = (sorted[1][1] * 100).toFixed(0);
      secondaryName.textContent = secondLabel;
      secondaryPct.textContent = `${secondProb}%`;
      secondaryTone.hidden = false;
    } else {
      secondaryTone.hidden = true;
    }
  };

  // Render Full Result
  const renderResult = (data, recordHistory = true) => {
    clearError();
    currentReadingData = data;
    const topEmotion = data.predicted_emotion;
    const meta = EMOTIONS[topEmotion] ?? EMOTIONS.joy;

    // Set page accent & dynamic background illumination
    document.documentElement.style.setProperty('--accent', `var(${meta.color})`);
    if (ambientGlow) {
      ambientGlow.style.background = `radial-gradient(circle at 50% 25%, ${meta.glow} 0%, transparent 70%)`;
    }

    resultEmoji.textContent = meta.emoji;
    resultEmotion.textContent = topEmotion;
    resultConfidence.textContent = `${Math.round(data.confidence * 100)}%`;
    resultQuote.textContent = meta.quote;

    renderSpectrumAndBars(data.all_probabilites, topEmotion);

    readingEl.hidden = false;
    readingEl.removeAttribute('data-enter');
    void readingEl.offsetWidth; // force CSS reflow
    readingEl.setAttribute('data-enter', '');

    if (recordHistory) {
      saveToHistory(data);
    }
  };

  // Submit Logic
  const submit = async () => {
    const text = entry.value.trim();
    clearError();

    if (!text) {
      showError('Type something first — even a sentence is enough.');
      entry.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || 'The emotion reader is temporarily unavailable.');
      }

      const data = await res.json();
      renderResult(data, true);

      // Successfully predicted, so mark engine online
      modelStatus.classList.add('is-ready');
      modelStatus.classList.remove('is-error');
      statusLabel.textContent = 'Engine Online';

      // Smooth scroll to result
      window.scrollTo({
        top: readingEl.offsetTop - 40,
        behavior: 'smooth'
      });
    } catch (err) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed'))) {
        showError('Unable to connect to the backend server. Please make sure the FastAPI server is running at http://127.0.0.1:8000 (run: python main.py).');
      } else {
        showError(err.message || 'The emotion reader is temporarily unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy Result Functionality
  const copyReading = async () => {
    if (!currentReadingData) return;
    const meta = EMOTIONS[currentReadingData.predicted_emotion] || EMOTIONS.joy;
    const breakdownText = Object.entries(currentReadingData.all_probabilites)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
      .join(', ');

    const textToCopy = `"${currentReadingData.text}"\n\n` +
      `Dominant Emotion: ${currentReadingData.predicted_emotion.toUpperCase()} ${meta.emoji} (${Math.round(currentReadingData.confidence * 100)}% Certainty)\n` +
      `Breakdown: ${breakdownText}\n` +
      `Reflection: ${meta.quote}\n\n` +
      `— Analyzed via Reader (Emotion AI)`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('Reading copied to clipboard ✨');
    } catch (e) {
      showToast('Failed to copy to clipboard');
    }
  };

  // Reset / New Thought
  const resetForm = () => {
    entry.value = '';
    updateMetrics();
    readingEl.hidden = true;
    currentReadingData = null;
    clearError();
    entry.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Ready for a new thought');
  };

  // Event Listeners
  entry.addEventListener('input', updateMetrics);

  entry.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  submitBtn.addEventListener('click', submit);
  clearBtn.addEventListener('click', clearText);
  copyBtn.addEventListener('click', copyReading);
  resetBtn.addEventListener('click', resetForm);

  // Sample prompt chips
  sampleChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const sample = chip.dataset.sample;
      if (sample) {
        entry.value = sample;
        updateMetrics();
        clearError();
        entry.focus();
        showToast('Sample loaded — click "Read this" or press Ctrl+Enter');
      }
    });
  });

  // History Drawer Listeners
  historyToggleBtn.addEventListener('click', openHistoryDrawer);
  closeDrawerBtn.addEventListener('click', closeHistoryDrawer);
  historyBackdrop.addEventListener('click', closeHistoryDrawer);

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all saved journal readings?')) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      showToast('Journal history cleared');
    }
  });

  // Keyboard shortcut ESC to close history
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyDrawer.classList.contains('is-open')) {
      closeHistoryDrawer();
    }
  });

  // Initialization
  updateMetrics();
  renderHistory();
  checkHealth();
  setInterval(checkHealth, 8000);
  initSpeechRecognition();
})();

