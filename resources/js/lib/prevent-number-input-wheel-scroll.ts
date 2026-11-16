function isWheelSensitiveInput(element: EventTarget | null): element is HTMLInputElement {
    return element instanceof HTMLInputElement && element.type === 'number';
}

/** Stop mouse-wheel from incrementing/decrementing focused `type="number"` inputs. */
export function installPreventNumberInputWheelScroll(): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.addEventListener(
        'wheel',
        (event) => {
            if (!isWheelSensitiveInput(event.target)) {
                return;
            }

            if (document.activeElement === event.target) {
                event.preventDefault();
            }
        },
        { passive: false, capture: true },
    );
}
