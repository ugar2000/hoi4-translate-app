import {CaretPosition, CaretPositionOptions, LANGUAGE_CODES} from "@/types";

export function isLanguageCode(value: string): value is LANGUAGE_CODES {
    return Object.values(LANGUAGE_CODES).includes(value as LANGUAGE_CODES);
}

const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
] as const;

type StyleProperty = typeof properties[number];

const isBrowser = (typeof window !== 'undefined');

let mirrorDiv: HTMLDivElement | null = null;

function createMirrorDiv(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    document.body.appendChild(div);
    return div;
}

function getMirrorDiv(): HTMLDivElement {
    if (!mirrorDiv) {
        mirrorDiv = createMirrorDiv();
    }
    return mirrorDiv;
}

function copyStyles(source: HTMLElement, target: HTMLElement): void {
    const computed = window.getComputedStyle(source);
    properties.forEach((prop) => {
        target.style[prop] = computed[prop];
    });
}

export function getCaretCoordinates(element: HTMLInputElement | HTMLTextAreaElement, position: number, options?: CaretPositionOptions): CaretPosition {
    if (!isBrowser) {
        throw new Error('getCaretCoordinates should only be called in a browser environment');
    }

    const isInput = element.nodeName === 'INPUT';
    const div = getMirrorDiv();

    copyStyles(element, div);

    div.textContent = element.value.substring(0, position);
    if (isInput) {
        div.textContent = div.textContent.replace(/\s/g, '\u00a0');
    }

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    const coordinates: CaretPosition = {
        top: span.offsetTop + parseInt(window.getComputedStyle(element).borderTopWidth),
        left: span.offsetLeft + parseInt(window.getComputedStyle(element).borderLeftWidth),
        height: parseInt(window.getComputedStyle(element).lineHeight)
    };

    div.removeChild(span);
    div.textContent = '';

    return coordinates;
}

export function trimToSecondLastUnderscore(str: string) {
    const regex = /^(.*_)(?=[^_]*_[^_]*$)/;
    const match = str.match(regex);
    return match ? match[1] : str;
}