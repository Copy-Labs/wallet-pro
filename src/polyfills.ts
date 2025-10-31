// In a new file like src/polyfills.ts
// Browser replacement for math-intrinsics isNaN
if (typeof Math?.isNaN === 'undefined') {
  Math.isNaN = function(value: number): boolean {
    return value !== value // NaN is the only value not equal to itself
  }
}

export {} // Make it a module
