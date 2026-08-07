// Minimal, dependency-free confetti burst using the Web Animations API.
// No external package needed — just a handful of animated divs.

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export function fireConfetti(particleCount = 120) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const size = 6 + Math.random() * 6;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const startX = Math.random() * window.innerWidth;
    const drift = (Math.random() - 0.5) * 300;
    const rotation = Math.random() * 720 - 360;
    const duration = 2200 + Math.random() * 1400;
    const delay = Math.random() * 300;

    particle.style.position = 'absolute';
    particle.style.left = `${startX}px`;
    particle.style.top = '-20px';
    particle.style.width = `${size}px`;
    particle.style.height = `${size * 0.4}px`;
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '1px';
    container.appendChild(particle);

    const animation = particle.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${rotation}deg)`,
          opacity: 0.9,
        },
      ],
      { duration, delay, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' },
    );

    animation.onfinish = () => particle.remove();
  }

  // Clean up the container once every particle has finished.
  setTimeout(() => container.remove(), 4200);
}
