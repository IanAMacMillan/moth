const test = require('node:test');
const assert = require('node:assert/strict');

const optics = require('../modematching_moth/optics-core.js');

function approx(actual, expected, tolerance, message) {
    assert.ok(Number.isFinite(actual), `${message} should be finite`);
    assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

function approxComplex(actual, expected, tolerance, message) {
    approx(actual.re, expected.re, tolerance, `${message} (real)`);
    approx(actual.im, expected.im, tolerance, `${message} (imag)`);
}

function makeSystem(overrides = {}) {
    return {
        initial: {
            waist: 350e-6,
            waistZ: 0,
            lambda: 1064e-9,
            reference: 0,
            ...(overrides.initial || {})
        },
        target: {
            waist: 40e-6,
            waistZ: 0.8,
            waistTolerance: 2e-6,
            positionTolerance: 5e-3,
            ...(overrides.target || {})
        },
        components: {
            lenses: [],
            analyzers: [],
            ...(overrides.components || {})
        }
    };
}

test('free-space propagation matches analytical Gaussian beam formulas', () => {
    const system = optics.normalizeSystem(makeSystem());
    const trace = optics.traceSystem(system, { sampleRange: { min: -0.1, max: 0.3 }, sampleCount: 80 });
    const sample = optics.queryTraceAtZ(trace, 0.2);
    const zR = Math.PI * system.initial.waist * system.initial.waist / system.initial.lambda;
    const expectedW = system.initial.waist * Math.sqrt(1 + Math.pow(0.2 / zR, 2));
    const expectedR = 0.2 * (1 + Math.pow(zR / 0.2, 2));

    approx(sample.metrics.w, expectedW, 1e-12, 'free-space spot size');
    approx(sample.metrics.R, expectedR, 1e-9, 'free-space radius of curvature');
});

test('thin-lens transform agrees with direct q-parameter calculation', () => {
    const system = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'L1', label: 'Lens 1', focalLength: 0.2, position: 0.1 }],
            analyzers: []
        }
    }));
    const trace = optics.traceSystem(system, { sampleRange: { min: 0, max: 0.4 }, sampleCount: 100 });

    const q0 = optics.initialQFromBeam(system.initial);
    const expectedBefore = optics.propagateFreeSpace(q0, 0.1);
    const expectedAfter = optics.applyThinElement(expectedBefore, 0.2);

    approxComplex(trace.elementStates[0].qBefore, expectedBefore, 1e-15, 'q before lens');
    approxComplex(trace.elementStates[0].qAfter, expectedAfter, 1e-15, 'q after lens');
});

test('curved mirror normalization matches a lens with f = R / 2', () => {
    const mirrorSystem = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'M1', type: 'mirror', roc: 0.4, position: 0.1 }],
            analyzers: []
        }
    }));
    const lensSystem = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'L1', type: 'lens', focalLength: 0.2, position: 0.1 }],
            analyzers: []
        }
    }));

    const mirrorTrace = optics.traceSystem(mirrorSystem, { sampleRange: { min: 0, max: 0.8 }, sampleCount: 160 });
    const lensTrace = optics.traceSystem(lensSystem, { sampleRange: { min: 0, max: 0.8 }, sampleCount: 160 });
    const mirrorSample = optics.queryTraceAtZ(mirrorTrace, 0.45);
    const lensSample = optics.queryTraceAtZ(lensTrace, 0.45);

    approx(mirrorSample.metrics.w, lensSample.metrics.w, 1e-12, 'mirror vs lens spot size');
    approx(mirrorSample.metrics.R, lensSample.metrics.R, 1e-9, 'mirror vs lens ROC');
});

test('exact output waist is injected into sampled positions', () => {
    const system = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'L1', focalLength: 0.15, position: 0.2 }],
            analyzers: []
        }
    }));
    const trace = optics.traceSystem(system, { sampleRange: { min: 0, max: 0.8 }, sampleCount: 120 });
    const hasExactWaistAnchor = trace.z.some((z) => Math.abs(z - trace.outputWaist.z) <= 1e-12);

    assert.equal(hasExactWaistAnchor, true);
});

test('analyzer samples come from the same canonical trace query path', () => {
    const system = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'L1', focalLength: 0.2, position: 0.18 }],
            analyzers: [{ id: 'A1', position: 0.41, lensExclusionRadius: 0.01 }]
        }
    }));
    const trace = optics.traceSystem(system, { sampleRange: { min: 0, max: 0.8 }, sampleCount: 120 });
    const analyzerSample = trace.analyzers[0].sample;
    const directSample = optics.queryTraceAtZ(trace, 0.41);

    approx(analyzerSample.metrics.w, directSample.metrics.w, 1e-15, 'analyzer spot size');
    approx(analyzerSample.metrics.R, directSample.metrics.R, 1e-12, 'analyzer ROC');
    approx(analyzerSample.gouy, directSample.gouy, 1e-15, 'analyzer Gouy phase');
});

test('target evaluation is perfect when the target equals the actual waist', () => {
    const base = makeSystem({
        target: {
            waist: 350e-6,
            waistZ: 0,
            waistTolerance: 1e-9,
            positionTolerance: 1e-9
        }
    });
    const system = optics.normalizeSystem(base);
    const trace = optics.traceSystem(system, { sampleRange: { min: -0.2, max: 0.2 }, sampleCount: 80 });
    const evaluation = optics.evaluateTarget(trace, system.target);

    approx(evaluation.modeMatching, 1, 1e-12, 'perfect mode overlap');
    approx(evaluation.errorW, 0, 1e-15, 'perfect waist-size error');
    approx(evaluation.errorZ, 0, 1e-15, 'perfect waist-position error');
});

test('queries remain valid before the first lens and between lenses', () => {
    const system = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [
                { id: 'L1', focalLength: 0.2, position: 0.3 },
                { id: 'L2', focalLength: -0.15, position: 0.65 }
            ],
            analyzers: []
        }
    }));
    const trace = optics.traceSystem(system, { sampleRange: { min: -0.1, max: 1 }, sampleCount: 160 });
    const beforeFirst = optics.queryTraceAtZ(trace, 0.15);
    const betweenLenses = optics.queryTraceAtZ(trace, 0.5);

    assert.ok(Number.isFinite(beforeFirst.metrics.w));
    assert.ok(Number.isFinite(beforeFirst.gouy));
    assert.ok(Number.isFinite(betweenLenses.metrics.w));
    assert.ok(Number.isFinite(betweenLenses.gouy));
});

test('negative focal length produces a valid virtual output waist solution', () => {
    const system = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'L1', focalLength: -0.25, position: 0.2 }],
            analyzers: []
        }
    }));
    const trace = optics.traceSystem(system, { sampleRange: { min: 0, max: 0.8 }, sampleCount: 100 });

    assert.ok(trace.outputWaist);
    assert.ok(Number.isFinite(trace.outputWaist.z));
    assert.ok(Number.isFinite(trace.outputWaist.w));
    assert.ok(trace.outputWaist.w > 0);
});

test('invalid inputs fail validation cleanly', () => {
    const system = optics.normalizeSystem(makeSystem({
        initial: { waist: -1, lambda: 0 },
        components: {
            lenses: [{ id: 'bad', focalLength: 0, position: 0.2 }],
            analyzers: []
        }
    }));

    assert.equal(system.validation.isValid, false);
    assert.ok(system.validation.errors.length >= 2);
});

test('golden one-lens waist calculation matches direct post-lens q extraction', () => {
    const system = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'L1', focalLength: 0.18, position: 0.22 }],
            analyzers: []
        }
    }));
    const trace = optics.traceSystem(system, { sampleRange: { min: 0, max: 0.9 }, sampleCount: 140 });

    const q0 = optics.initialQFromBeam(system.initial);
    const qBefore = optics.propagateFreeSpace(q0, 0.22);
    const qAfter = optics.applyThinElement(qBefore, 0.18);
    const expectedWaistZ = 0.22 - qAfter.re;
    const expectedWaistW = Math.sqrt(system.initial.lambda * qAfter.im / Math.PI);

    approx(trace.outputWaist.z, expectedWaistZ, 1e-12, 'one-lens output waist location');
    approx(trace.outputWaist.w, expectedWaistW, 1e-12, 'one-lens output waist size');
});

test('solution scoring reports the same target-plane metrics as evaluation', () => {
    const system = optics.normalizeSystem(makeSystem({
        components: {
            lenses: [{ id: 'L1', focalLength: 0.2, position: 0.18 }],
            analyzers: []
        }
    }));
    const trace = optics.traceSystem(system, { sampleRange: { min: 0, max: 0.9 }, sampleCount: 120 });
    const scored = optics.scoreSolution(trace, system.target);
    const evaluated = optics.evaluateTarget(trace, system.target);

    approx(scored.metrics.wAtTarget, evaluated.sample.metrics.w, 1e-15, 'scored target waist');
    approx(scored.metrics.RAtTarget, evaluated.sample.metrics.R, 1e-12, 'scored target ROC');
    approx(scored.modeMatching, evaluated.modeMatching, 1e-15, 'scored mode overlap');
});
