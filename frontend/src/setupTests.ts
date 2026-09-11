import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement SVGSVGElement.createSVGPoint, which
// gantt-task-react calls internally to convert mouse coordinates during
// its drag/resize handlers. Polyfill a minimal DOMPoint-like stub so
// components using <Gantt /> can render under jsdom in tests.
if (typeof SVGSVGElement !== 'undefined' && !SVGSVGElement.prototype.createSVGPoint) {
  SVGSVGElement.prototype.createSVGPoint = function createSVGPoint() {
    return {
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: 0, y: 0 };
      },
    } as unknown as DOMPoint;
  };
}

// Same story for SVGGraphicsElement.getBBox, used to measure task label
// text. The type isn't declared on this TS lib target, hence the casts.
const svgElementProto = SVGElement.prototype as unknown as {
  getBBox?: () => DOMRect;
};
if (typeof SVGElement !== 'undefined' && !svgElementProto.getBBox) {
  svgElementProto.getBBox = function getBBox() {
    return { x: 0, y: 0, width: 0, height: 0 } as DOMRect;
  };
}
