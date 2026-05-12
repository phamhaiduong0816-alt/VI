/*
  GreenLife – script.js
  - CO₂ calculator logic
  - Form validation
  - Chart.js updates
  - Counter animation (stats)
  - Scroll reveal animation
  - Navbar effect on scroll + mobile nav toggle
  - Smooth scrolling
*/

(function () {
  // --------- Helpers ---------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // --------- Footer year (if exists) ---------
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --------- Mobile navbar toggle ---------
  const navToggle = $('[data-nav-toggle]');
  const navLinks = $('[data-nav-links]');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.getAttribute('data-open') === 'true';
      navLinks.setAttribute('data-open', String(!isOpen));
      navToggle.setAttribute('aria-expanded', String(!isOpen));
    });

    // Close on link click (mobile)
    $$('.nav-links a', navLinks).forEach((a) => {
      a.addEventListener('click', () => {
        navLinks.setAttribute('data-open', 'false');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --------- Navbar scroll effect ---------
  const navbar = $('#siteNavbar');
  const onScroll = () => {
    if (!navbar) return;
    const scrolled = window.scrollY > 10;
    navbar.classList.toggle('scrolled', scrolled);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --------- Smooth scrolling ---------
  // (Navigation already uses full page links, but buttons/anchors inside a page can use smooth.)
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // --------- Scroll reveal ---------
  const revealEls = $$('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  // --------- CO₂ Calculator ---------
  const calcForm = $('#co2Form');
  const errorBox = $('#calcError');

  // Result fields
  const outTotal = $('#outTotalCO2');
  const outImpact = $('#outImpact');
  const outTrees = $('#outTrees');
  const outTip = $('#outTip');

  // Chart canvas
  const chartCanvas = $('#co2Chart');
  let co2Chart = null;

  function resetCalcOutput() {
    if (outTotal) outTotal.textContent = '—';
    if (outImpact) outImpact.textContent = '—';
    if (outTrees) outTrees.textContent = '—';
    if (outTip) outTip.textContent = '—';
  }

  function formatNumber(n) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);
  }

  function getImpactLabel(totalKg) {
    // Simple demo categorization
    if (totalKg < 10) return { label: 'Tác động thấp', color: 'rgba(16,181,105,.95)' };
    if (totalKg < 25) return { label: 'Tác động trung bình', color: 'rgba(255,214,102,.95)' };
    return { label: 'Tác động cao', color: 'rgba(255,132,132,.95)' };
  }

  function getTreeSuggestion(totalKg) {
    // Demo: 1 tree absorbs ~ 22 kg CO2/year (converted from totalKg input as "monthly total" for fun)
    const yearlyAbsorb = 22;
    const trees = Math.max(0, Math.ceil((totalKg / yearlyAbsorb) * 12));

    // Tips based on bigger component
    const comps = window.__co2Components;
    if (!comps) {
      return {
        trees,
        tip: 'Bắt đầu từ những thói quen nhỏ: giảm quãng đường xe máy, dùng điện hiệu quả và tăng trồng cây.'
      };
    }

    const maxKey = Object.keys(comps).reduce((best, k) => (comps[k] > comps[best] ? k : best), Object.keys(comps)[0]);

    const tipBy = {
      motor: 'Ưu tiên đi xe công cộng/đi chung chuyến để giảm phát thải từ xe máy.',
      electricity: 'Giảm điện bằng cách tắt thiết bị khi không dùng và tối ưu điều hòa/độ sáng.',
      bag: 'Mang túi vải/tái sử dụng để giảm túi nilon mỗi ngày.',
      ac: 'Duy trì nhiệt độ hợp lý (26–28°C) và hạn chế chạy điều hòa liên tục.'
    };

    return {
      trees,
      tip: tipBy[maxKey] || 'Kết hợp nhiều giải pháp: tiết kiệm điện, giảm rác nhựa và tăng hoạt động xanh.'
    };
  }

  function buildChart(values) {
    const ctx = chartCanvas?.getContext('2d');
    if (!ctx) return;

    const labels = ['Xe máy', 'Điện', 'Túi nilon', 'Điều hòa'];
    const data = [values.motor, values.electricity, values.bag, values.ac];

    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'CO₂ (kg)',
            data,
            backgroundColor: [
              'rgba(16,181,105,.55)',
              'rgba(69,221,147,.45)',
              'rgba(255,214,102,.35)',
              'rgba(255,132,132,.32)'
            ],
            borderColor: [
              'rgba(16,181,105,.95)',
              'rgba(69,221,147,.9)',
              'rgba(255,214,102,.85)',
              'rgba(255,132,132,.85)'
            ],
            borderWidth: 1,
            borderRadius: 10,
            hoverBackgroundColor: [
              'rgba(16,181,105,.75)',
              'rgba(69,221,147,.65)',
              'rgba(255,214,102,.55)',
              'rgba(255,132,132,.5)'
            ]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${formatNumber(ctx.parsed.y)} kg`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,.08)' },
            ticks: { color: 'rgba(255,255,255,.75)' }
          },
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255,255,255,.82)', font: { weight: 800 } }
          }
        }
      }
    };

    if (co2Chart) {
      co2Chart.data.datasets[0].data = data;
      co2Chart.update();
      return;
    }

    co2Chart = new Chart(ctx, config);
  }

  function validateNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0;
  }

  function getFormValues() {
    const km = $('#km');
    const kwh = $('#kwh');
    const bag = $('#bag');
    const ac = $('#ac');
    return {
      km: km ? km.value : '',
      kwh: kwh ? kwh.value : '',
      bag: bag ? bag.value : '',
      ac: ac ? ac.value : ''
    };
  }

  function computeCO2({ km, kwh, bag, ac }) {
    // Formulas (given by user)
    // Xe máy: km × 0.12
    // Điện: kWh × 0.85
    // Túi nilon: số lượng × 0.01
    // Điều hòa: giờ × 0.5
    const motor = Number(km) * 0.12;
    const electricity = Number(kwh) * 0.85;
    const bagCO2 = Number(bag) * 0.01;
    const acCO2 = Number(ac) * 0.5;

    const total = motor + electricity + bagCO2 + acCO2;

    window.__co2Components = {
      motor,
      electricity,
      bag: bagCO2,
      ac: acCO2
    };

    return { motor, electricity, bag: bagCO2, ac: acCO2, total };
  }

  if (calcForm) {
    resetCalcOutput();

    calcForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (errorBox) errorBox.classList.remove('is-visible');
      if (errorBox) errorBox.textContent = '';

      const vals = getFormValues();

      const invalid = [];
      if (!validateNumber(vals.km)) invalid.push('Km đi xe máy/ngày');
      if (!validateNumber(vals.kwh)) invalid.push('kWh điện/tháng');
      if (!validateNumber(vals.bag)) invalid.push('Túi nilon/ngày');
      if (!validateNumber(vals.ac)) invalid.push('Giờ dùng điều hòa/ngày');

      if (invalid.length) {
        if (errorBox) {
          errorBox.textContent = 'Vui lòng nhập số hợp lệ cho: ' + invalid.join(', ') + '.';
          errorBox.classList.add('is-visible');
        }
        return;
      }

      const computed = computeCO2(vals);
      if (outTotal) outTotal.textContent = `${formatNumber(computed.total)} kg CO₂`;

      const impact = getImpactLabel(computed.total);
      if (outImpact) {
        outImpact.textContent = `${impact.label}`;
        outImpact.style.color = impact.color;
      }

      const { trees, tip } = getTreeSuggestion(computed.total);
      if (outTrees) outTrees.textContent = `${formatNumber(trees)} cây`;
      if (outTip) outTip.textContent = tip;

      buildChart({ motor: computed.motor, electricity: computed.electricity, bag: computed.bag, ac: computed.ac });
    });
  }

  // --------- Stats (counters + chart) ---------
  const statsRoot = $('#statsRoot');
  if (statsRoot) {
    const counters = [
      { el: $('#counterPeople'), value: 12840, suffix: '+' },
      { el: $('#counterCO2'), value: 842000, suffix: ' kg' },
      { el: $('#counterTrees'), value: 315000, suffix: '' },
      { el: $('#counterCampaigns'), value: 86, suffix: '' }
    ].filter((x) => x.el);

    const progressEl = $('#statsProgress');
    const progressTarget = Number(progressEl?.getAttribute('data-progress')) || 74;

    const chartEl = $('#statsChart');
    let statsChart = null;

    function animateCounter(el, target, suffix) {
      const duration = 1300;
      const start = performance.now();
      const from = 0;

      function tick(now) {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(from + (target - from) * eased);
        el.textContent = `${formatNumber(current)}${suffix || ''}`;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function renderStatsChart() {
      if (!chartEl || typeof Chart === 'undefined') return;
      const ctx = chartEl.getContext('2d');

      const labels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
      const series = [120, 160, 210, 260];

      const config = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Hoạt động xanh (đơn vị demo)',
              data: series,
              borderColor: 'rgba(16,181,105,.95)',
              backgroundColor: 'rgba(16,181,105,.18)',
              fill: true,
              tension: 0.35,
              pointRadius: 4,
              pointHoverRadius: 7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: 'rgba(255,255,255,.85)', font: { weight: 800 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y} hoạt động`
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(255,255,255,.08)' },
              ticks: { color: 'rgba(255,255,255,.75)' }
            },
            x: {
              grid: { display: false },
              ticks: { color: 'rgba(255,255,255,.82)', font: { weight: 800 } }
            }
          }
        }
      };

      statsChart = new Chart(ctx, config);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;

        // animate once
        observer.disconnect();

        counters.forEach((c) => animateCounter(c.el, c.value, c.suffix));

        if (progressEl && progressEl.querySelector('span')) {
          progressEl.querySelector('span').style.width = `${progressTarget}%`;
        }

        renderStatsChart();
      },
      { threshold: 0.2 }
    );

    observer.observe(statsRoot);
  }

})();

