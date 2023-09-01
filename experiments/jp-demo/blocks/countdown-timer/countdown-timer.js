import { createTag } from '../../../../libs/utils/utils.js';

const TIME_UNITS = /** @type {const} */ (['day', 'hour', 'minute']);

/** @param {number} n */
function padStart(n) {
  return n < 10 ? `0${n}` : n.toString();
}

/**
 * @param {Date} later @param {Date} earlier
 * @return {Record<typeof TIME_UNITS[number], number>}
 * */
function getDifferenceBetweenDates(later, earlier) {
  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;

  const diff = later.getTime() - earlier.getTime();

  return {
    day: Math.floor(diff / day),
    hour: Math.floor((diff % day) / hour),
    minute: Math.floor((diff % hour) / minute),
  };
}

/** @param {{digitElement: HTMLElement; value: string}} input */
function updateDigit({ digitElement, value }) {
  const top = digitElement.querySelector('.digit-top');
  const bottom = digitElement.querySelector('.digit-bottom');
  const flipTop = digitElement.querySelector('.digit-flip-top');
  const flipBottom = digitElement.querySelector('.digit-flip-bottom');

  // flip down the currently shown value from the top to the center
  flipTop.innerHTML = top.innerHTML;

  // set the new value that will show after the top animation
  top.querySelector('span').innerHTML = value;

  const topAnimation = flipTop.animate(
    [
      { transform: 'rotateX(0)' },
      { transform: 'rotateX(-90deg)' },
    ],
    {
      iterations: 1,
      duration: 500,
      easing: 'linear',
      fill: 'forwards',
    },
  );

  const onFinishTopAnimation = () => {
    topAnimation.removeEventListener('finish', onFinishTopAnimation);

    // flip down the new value from the center to the bottom
    flipBottom.querySelector('span').innerHTML = value;

    const bottomAnimation = flipBottom.animate(
      [
        { transform: 'rotateX(90deg)' },
        { transform: 'rotateX(0)' },
      ],
      {
        iterations: 1,
        duration: 500,
        easing: 'linear',
        fill: 'forwards',
      },
    );

    const onFinishBottomAnimation = () => {
      bottomAnimation.removeEventListener('finish', onFinishBottomAnimation);

      // set the new value that will show in the next bottomAnimation
      bottom.querySelector('span').innerHTML = value;
    };

    bottomAnimation.addEventListener('finish', onFinishBottomAnimation);
  };

  topAnimation.addEventListener('finish', onFinishTopAnimation);
}

/**
 * @param {{label: string; unit: typeof TIME_UNITS[number]; digits: string[] }} input
 * @returns {HTMLElement}
 */
function createTimeUnit({
  label,
  unit,
  digits,
}) {
  return createTag('div', { class: 'time-unit', 'aria-hidden': 'true' }, `
  <span class="time-unit-title">${label}</span>
  <div class="time-digit-group ${unit}">
    <div class="time-digit">
      <div class="digit-top">
        <span>${digits[0]}</span>
      </div>
      <div class="digit-bottom">
        <span>${digits[0]}</span>
      </div>
      <div class="digit-flip digit-flip-top">
        <span>${digits[0]}</span>
      </div>
      <div class="digit-flip digit-flip-bottom">
        <span>${digits[0]}</span>
      </div>
    </div>
    <div class="time-digit">
      <div class="digit-top">
        <span>${digits[1]}</span>
      </div>
      <div class="digit-bottom">
        <span>${digits[1]}</span>
      </div>
      <div class="digit-flip digit-flip-top">
        <span>${digits[1]}</span>
      </div>
      <div class="digit-flip digit-flip-bottom">
        <span>${digits[1]}</span>
      </div>
    </div>
  </div>
  `);
}

/** @param {Element} el */
export default function init(el) {
  const endAt = new Date(el.children[0]?.textContent?.trim());
  const timerLabel = el.children[1]?.children[0]?.textContent?.trim();
  const timeUnitLabels = el.children[1]?.children[1]?.textContent?.trim()?.split('|');

  if (Number.isNaN(endAt.getTime())) {
    // eslint-disable-next-line no-console
    console.log('could not create countdown-timer: invalid date');
    el.remove();
    return;
  }

  if (endAt.getTime() <= new Date().getTime()) {
    // eslint-disable-next-line no-console
    console.log(`removing countdown since endAt has already passed: ${endAt.toLocaleString()}`);
    el.remove();
    return;
  }

  if (timeUnitLabels?.length !== 3) {
    // eslint-disable-next-line no-console
    console.log('could not create countdown-timer: invalid time format');
    el.remove();
    return;
  }

  el.classList.add('con-block', 'max-width-8-desktop', 'center', 'l-spacing');

  const timerContainer = createTag('div', { class: 'timer-container' });
  const foreground = createTag('div', { class: 'foreground' }, timerContainer);
  el.replaceChildren(foreground);

  if (timerLabel) {
    timerContainer.appendChild(createTag('div', { class: 'timer-label' }, `<p>${timerLabel}</p>`));
  }

  const initialRemainingTime = getDifferenceBetweenDates(endAt, new Date());

  const state = {
    day: padStart(initialRemainingTime.day).split(''),
    hour: padStart(initialRemainingTime.hour).split(''),
    minute: padStart(initialRemainingTime.minute).split(''),
  };

  const timer = createTag(
    'div',
    {
      class: 'timer',
      'aria-label': TIME_UNITS.map((unit, i) => `${initialRemainingTime[unit]} ${timeUnitLabels[i]}`).join(' '),
    },
    TIME_UNITS.map((unit, i) => createTimeUnit({
      unit,
      label: timeUnitLabels[i],
      digits: state[unit],
    })),
  );

  timerContainer.appendChild(timer);

  const digitElements = {
    day: timer.querySelectorAll('.day > .time-digit'),
    hour: timer.querySelectorAll('.hour > .time-digit'),
    minute: timer.querySelectorAll('.minute > .time-digit'),
  };

  const interval = setInterval(() => {
    const now = new Date();

    if (endAt.getTime() <= now.getTime()) {
      clearInterval(interval);
      el.remove();
      return;
    }

    const remainingTime = getDifferenceBetweenDates(endAt, now);
    const remainingTimeAriaLabel = TIME_UNITS.map((unit, i) => `${remainingTime[unit]} ${timeUnitLabels[i]}`).join(' ');

    if (timer.getAttribute('aria-label') !== remainingTimeAriaLabel) {
      timer.setAttribute('aria-label', remainingTimeAriaLabel);
    }

    const nextState = {
      day: padStart(remainingTime.day).split(''),
      hour: padStart(remainingTime.hour).split(''),
      minute: padStart(remainingTime.minute).split(''),
    };

    // animate each digit if the value is different
    Object.entries(nextState).forEach(([key, digits]) => {
      digits.forEach((digit, index) => {
        if (state[key][index] !== digit) {
          state[key][index] = digit;

          updateDigit({
            digitElement: digitElements[key][index],
            value: state[key][index],
          });
        }
      });
    });
  }, 1000);
}
