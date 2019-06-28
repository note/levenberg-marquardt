import errorCalculation from './errorCalculation';
import step from './step';

/**
 * Curve fitting algorithm
 * @param {{x:Array<number>, y:Array<number>}} data - Array of points to fit in the format [x1, x2, ... ], [y1, y2, ... ]
 * @param {function} parameterizedFunction - The parameters and returns a function with the independent variable as a parameter
 * @param {object} [options] - Options object
 * @param {number} [options.damping] - Levenberg-Marquardt parameter
 * @param {number} [options.gradientDifference = 10e-2] - Adjustment for decrease the damping parameter
 * @param {Array<number>} [options.minValues] - Minimum allowed values for parameters
 * @param {Array<number>} [options.maxValues] - Maximum allowed values for parameters
 * @param {Array<number>} [options.initialValues] - Array of initial parameter values
 * @param {number} [options.maxIterations = 100] - Maximum of allowed iterations
 * @param {number} [options.errorTolerance = 10e-3] - Minimum uncertainty allowed for each point
 * @return {{parameterValues: Array<number>, parameterError: number, iterations: number}}
 */
export default function levenbergMarquardt(
  data,
  parameterizedFunction,
  options = {}
) {
  let {
    maxIterations = 100,
    gradientDifference = 10e-2,
    damping = 0,
    errorTolerance = 10e-3,
    minValues,
    maxValues,
    initialValues,
    alignToData = false,
    logAfterIteration = false
  } = options;

  if (damping <= 0) {
    throw new Error('The damping option must be a positive number');
  } else if (!data.x || !data.y) {
    throw new Error('The data parameter must have x and y elements');
  } else if (
    !Array.isArray(data.x) ||
    data.x.length < 2 ||
    !Array.isArray(data.y) ||
    data.y.length < 2
  ) {
    throw new Error(
      'The data parameter elements must be an array with more than 2 points'
    );
  } else if (data.x.length !== data.y.length) {
    throw new Error('The data parameter elements must have the same size');
  }

  const dataMin = Math.min.apply(null, data.y);
  const dataMax = Math.max.apply(null, data.y);

  var parameters =
    initialValues || new Array(parameterizedFunction.length).fill(1);
  let parLen = parameters.length;
  maxValues = maxValues || new Array(parLen).fill(Number.MAX_SAFE_INTEGER);
  minValues = minValues || new Array(parLen).fill(Number.MIN_SAFE_INTEGER);

  if (maxValues.length !== minValues.length) {
    throw new Error('minValues and maxValues must be the same size');
  }

  if (!Array.isArray(parameters)) {
    throw new Error('initialValues must be an array');
  }

  var error = errorCalculation(data, parameters, parameterizedFunction);

  var converged = error <= errorTolerance;

  for (
    var iteration = 0;
    iteration < maxIterations && !converged;
    iteration++
  ) {
    // change: data.x.map()
    let alignedFun = parameterizedFunction;
    if (alignToData) {
      const toAlign = data.x.map(parameterizedFunction(parameters));
      alignedFun = alignedFunction(parameterizedFunction, dataMin, dataMax, toAlign);
    }

    parameters = step(
      data,
      parameters,
      damping,
      gradientDifference,
      alignedFun
    );

    for (let k = 0; k < parLen; k++) {
      parameters[k] = Math.min(
        Math.max(minValues[k], parameters[k]),
        maxValues[k]
      );
    }

    error = errorCalculation(data, parameters, alignedFun);
    if (isNaN(error)) break;
    if (logAfterIteration) {
      console.log(`error: ${error}, parameters: ${parameters}`); // eslint-disable-line no-console
    }
    converged = error <= errorTolerance;
  }

  return {
    parameterValues: parameters,
    parameterError: error,
    iterations: iteration
  };
}

function alignedFunction(f, dataMin, dataMax, toAlign) {
  const funMin = Math.min.apply(null, toAlign);
  const funMax = Math.max.apply(null, toAlign);

  const params = getLinearParams(dataMin, dataMax, funMin, funMax);

  const res = (paramsToFit) => (x) => {
    const originalRes = f(paramsToFit)(x);
    return params[0] * originalRes + params[1];
  };

  return res;
}

function getLinearParams(dataMin, dataMax, funMin, funMax) {
  const a = (dataMin - dataMax) / (funMin - funMax);
  const b = dataMax - (a * funMax);
  return [a, b];
}
