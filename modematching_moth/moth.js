(() => {
    const optics = window.MothOptics;
    if (!optics) {
        throw new Error('MothOptics failed to load before moth.js');
    }
    const $ = (id) => document.getElementById(id);
    const dom = {
        initialWaist: $('initialWaist'),
        initialWaistZ: $('initialWaistZ'),
        initialLambda: $('initialLambda'),
        referencePlane: $('referencePlane'),
        targetWaist: $('targetWaist'),
        targetWaistZ: $('targetWaistZ'),
        targetWaistTolerance: $('targetWaistTolerance'),
        targetPositionTolerance: $('targetPositionTolerance'),
        lensLabelInput: $('lensLabelInput'),
        lensTypeInput: $('lensTypeInput'),
        lensFocalInput: $('lensFocalInput'),
        lensRocInput: $('lensRocInput'),
        lensFocalLabel: $('lensFocalLabel'),
        lensRocLabel: $('lensRocLabel'),
        lensPositionInput: $('lensPositionInput'),
        addLensBtn: $('addLensBtn'),
        cancelLensEditBtn: $('cancelLensEditBtn'),
        clearLensesBtn: $('clearLensesBtn'),
        lensTable: $('lensTable'),
        addLensQuick: $('addLensQuick'),
        addAnalyzerQuick: $('addAnalyzerQuick'),
        analyzerLabelInput: $('analyzerLabelInput'),
        analyzerPositionInput: $('analyzerPositionInput'),
        analyzerExclusionInput: $('analyzerExclusionInput'),
        addAnalyzerBtn: $('addAnalyzerBtn'),
        clearAnalyzersBtn: $('clearAnalyzersBtn'),
        analyzerTable: $('analyzerTable'),
        libraryLensLabel: $('libraryLensLabel'),
        libraryLensFocal: $('libraryLensFocal'),
        addLibraryLensBtn: $('addLibraryLensBtn'),
        clearLibraryBtn: $('clearLibraryBtn'),
        resetLibraryBtn: $('resetLibraryBtn'),
    exportLibraryCsvBtn: $('exportLibraryCsvBtn'),
    importLibraryCsvBtn: $('importLibraryCsvBtn'),
    importLibraryCsvInput: $('importLibraryCsvInput'),
        libraryTable: $('libraryTable'),
    copySettingsLinkBtn: $('copySettingsLinkBtn'),
        solverLensCount: $('solverLensCount'),
        solverLensSpacing: $('solverLensSpacing'),
        solverZMin: $('solverZMin'),
        solverZMax: $('solverZMax'),
        solverGridSteps: $('solverGridSteps'),
        solverModeMatch: $('solverModeMatch'),
        solverAllowDuplicates: $('solverAllowDuplicates'),
        solverClearBeforeSearch: $('solverClearBeforeSearch'),
        runSolverBtn: $('runSolverBtn'),
        solverStatus: $('solverStatus'),
        solutionsList: $('solutionsList'),
        toggleSolutionsList: $('toggleSolutionsList'),
        beamCanvas: $('beamCanvas'),
        beamChart: $('beamChart'),
        dragIndicator: $('dragIndicator'),
        exportConfigBtn: $('exportConfigBtn'),
        importConfigBtn: $('importConfigBtn'),
        importConfigFile: $('importConfigFile'),
        exportPlotDataBtn: $('exportPlotDataBtn'),
        downloadPlotBtn: $('downloadPlotBtn'),
        toggleLock: $('toggleLock'),
        toggleAutoY: $('toggleAutoY'),
        toggleLimitsPanel: $('toggleLimitsPanel'),
        customLimitsPanel: $('customLimitsPanel'),
        canvasLimitXMin: $('canvasLimitXMin'),
        canvasLimitXMax: $('canvasLimitXMax'),
        canvasLimitY: $('canvasLimitY'),
        versionTag: $('versionTag')
    };

    const state = {
        initial: {
            waist: micronsToMeters(parseFloat(dom.initialWaist.value)),
            waistZ: parseFloat(dom.initialWaistZ.value) || 0,
            lambda: nanometersToMeters(parseFloat(dom.initialLambda.value)),
            reference: parseFloat(dom.referencePlane.value) || 0
        },
        target: {
            waist: micronsToMeters(parseFloat(dom.targetWaist.value)),
            waistZ: parseFloat(dom.targetWaistZ.value) || 0.8,
            waistTolerance: micronsToMeters(parseFloat(dom.targetWaistTolerance.value)),
            positionTolerance: millimetersToMeters(parseFloat(dom.targetPositionTolerance.value))
        },
        components: {
            lenses: [],
            analyzers: []
        },
        library: [],
        librarySequence: 1,
            solver: {
            lensCount: parseInt(dom.solverLensCount.value, 10) || 2,
            zMin: parseFloat(dom.solverZMin.value) || 0,
            zMax: parseFloat(dom.solverZMax.value) || 1,
            gridSteps: parseInt(dom.solverGridSteps.value, 10) || 15,
            minModeMatch: clamp(parseFloat(dom.solverModeMatch.value) / 100, 0, 1),
            allowDuplicates: dom.solverAllowDuplicates.value === 'true',
            clearBeforeSearch: dom.solverClearBeforeSearch?.value === 'true',
            minLensSpacing: centimetersToMeters(parseFloat(dom.solverLensSpacing?.value) || 2)
        },
    chart: null,
    canvas: { scale: null, pointerZ: null, lockedMaxRadius: null, lastMaxRadius: null, customLimits: { xMin: null, xMax: null, yLimit: null } },
    locked: false,
    autoScaleY: true,
        lastTrace: null,
        editingLensId: null,
        solutions: [],
        selectedSolutionId: null,
        solutionsCollapsed: false,
        idCounter: 1,
        lensLabelSequence: 0,
        mirrorLabelSequence: 0
    };

    const dragState = { active: false, type: null, id: null, startPointer: 0, startPosition: 0, modified: false };
    const BUILTIN_FOCAL_LENGTHS = [25, 30, 38.1, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400, 500, 750, 1000];
    const SHARE_BASE_URL = 'https://ian-macmillan.com/Mode-Matching/';
    const APP_VERSION = '2.0.0';

    function micronsToMeters(value) { return (Number.isFinite(value) ? value : 0) * 1e-6; }
    function metersToMicrons(value) { return value * 1e6; }
    function nanometersToMeters(value) { return (Number.isFinite(value) ? value : 0) * 1e-9; }
    function centimetersToMeters(value) { return (Number.isFinite(value) ? value : 0) * 1e-2; }
    function metersToCentimeters(value) { return value * 1e2; }
    function metersToMillimeters(value) { return value * 1e3; }
    function millimetersToMeters(value) { return (Number.isFinite(value) ? value : 0) * 1e-3; }
    function clamp(value, min, max) { if (!Number.isFinite(value)) return min; return Math.min(Math.max(value, min), max); }
    function nextId(prefix) { const id = `${prefix}-${state.idCounter++}`; return id; }
    function formatNumber(value, options = {}) {
        if (!Number.isFinite(value)) return 'N/A';
        const { precision = 3, unit = '', scale = 1, trim = true } = options;
        const scaled = value * scale;
        let str = scaled.toFixed(precision);
        if (trim) { str = str.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'); }
        return unit ? `${str} ${unit}` : str;
    }
    function deriveLensLabel(label, focalMm, fallback = '', type = 'lens') {
        const trimmed = (label || '').trim();
        if (trimmed.length) return trimmed;
        if (fallback && fallback.trim().length) return fallback;
        // Auto-generate Lens A, B, C or Mirror A, B, C based on type
        const isMirror = type === 'mirror';
        const sequenceKey = isMirror ? 'mirrorLabelSequence' : 'lensLabelSequence';
        const letterIndex = state[sequenceKey] % 26;
        const letter = String.fromCharCode(65 + letterIndex); // 65 = 'A'
        state[sequenceKey]++;
        return isMirror ? `Mirror ${letter}` : `Lens ${letter}`;
    }
    function formatFocalDescriptor(prefix, focalMm) {
        const magnitude = Math.abs(focalMm);
        const precision = magnitude >= 100 ? 0 : 1;
        const formatted = formatNumber(magnitude, { precision, trim: true });
        const sign = focalMm >= 0 ? '+' : '−';
        return `${prefix} (${sign}${formatted} mm)`;
    }
    function cloneLibraryEntries(entries) { return entries.map((lens) => ({ id: lens.id, label: lens.label, focalLengthMm: lens.focalLengthMm })); }
    function buildBuiltinLibrary() { return BUILTIN_FOCAL_LENGTHS.map((focal, index) => ({ id: `Common-${focal >= 0 ? 'P' : 'N'}-${Math.round(Math.abs(focal) * 10)}-${index}`, label: formatFocalDescriptor('Common lens', focal), focalLengthMm: focal })); }
    function computeLibrarySequence(entries) {
        if (!Array.isArray(entries) || !entries.length) return 1;
        let maxIndex = 0; const pattern = /^Library lens (\d+)$/i;
        for (const lens of entries) { if (!lens || typeof lens.label !== 'string') continue; const match = lens.label.match(pattern); if (match) { const value = parseInt(match[1], 10); if (Number.isFinite(value)) maxIndex = Math.max(maxIndex, value); } }
        return maxIndex + 1;
    }
    function assignLibraryLabel(inputLabel) { const trimmed = (inputLabel || '').trim(); let label = trimmed; if (!label) { label = `Library lens ${state.librarySequence}`; } state.librarySequence += 1; return label; }
    function renderLibraryTable() {
        if (!state.library.length) { if (dom.libraryTable) { dom.libraryTable.className = 'mm-empty-state'; dom.libraryTable.innerHTML = 'No catalog lenses yet.'; } return; }
        const rows = state.library.map((lens) => {
            const precision = Math.abs(lens.focalLengthMm) >= 100 ? 0 : 1;
            const focalCell = formatNumber(lens.focalLengthMm, { precision, unit: 'mm' });
            const label = lens.label || formatFocalDescriptor('Common lens', lens.focalLengthMm);
            return `<tr data-id="${lens.id}"><td>${label}</td><td>${focalCell}</td><td><button type="button" class="mm-button-ghost" data-action="remove-library-lens" title="Remove this catalog lens">Remove</button></td></tr>`;
        }).join('');
        const table = `<table><thead><tr><th>Label</th><th>focal length</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
        if (dom.libraryTable) { dom.libraryTable.className = ''; dom.libraryTable.innerHTML = table; }
    }
    function normalizeLibraryEntry(raw) {
        if (!raw) return null; let focal = Number(raw.focalLengthMm); if (!Number.isFinite(focal)) focal = Number(raw.focal);
        if (!Number.isFinite(focal) || Math.abs(focal) < 1e-3) return null; const label = raw.label || formatFocalDescriptor('Common lens', focal);
        return { id: raw.id || nextId('Catalog'), label, focalLengthMm: focal };
    }
    function normalizeComponentLens(raw, fallbackIndex = 0) {
        if (!raw || typeof raw !== 'object') return null;
        let focal = Number(raw.focalLength ?? raw.focal ?? raw.f);
        if (!Number.isFinite(focal) && Number.isFinite(raw.focalLengthMm)) {
            focal = millimetersToMeters(Number(raw.focalLengthMm));
        }
        const position = Number(raw.position ?? raw.z ?? raw.location);
        if (!Number.isFinite(focal) || !Number.isFinite(position)) return null;
        const id = typeof raw.id === 'string' ? raw.id : `ImportedL-${fallbackIndex + 1}`;
        const label = typeof raw.label === 'string' ? raw.label : '';
        const sourceId = typeof raw.sourceId === 'string' ? raw.sourceId : null;
        return { id, focalLength: focal, position, label, sourceId };
    }
    function normalizeAnalyzerEntry(raw, fallbackIndex = 0) {
        if (!raw || typeof raw !== 'object') return null;
        const position = Number(raw.position ?? raw.z ?? raw.location ?? 0);
        if (!Number.isFinite(position)) return null;
        const exclusionValue = Number(raw.lensExclusionRadius ?? raw.exclusionRadius ?? raw.lensExclusion ?? 0);
        const lensExclusionRadius = Math.max(0, Number.isFinite(exclusionValue) ? exclusionValue : 0);
        const id = typeof raw.id === 'string' ? raw.id : `ImportedA-${fallbackIndex + 1}`;
        const label = typeof raw.label === 'string' ? raw.label : '';
        return { id, label, position, lensExclusionRadius };
    }
    function cloneComponents(components) {
        if (!components) return { lenses: [], analyzers: [] };
        const lenses = Array.isArray(components.lenses)
            ? components.lenses.map((lens) => ({ id: lens.id, label: lens.label, focalLength: lens.focalLength, position: lens.position, sourceId: lens.sourceId || null }))
            : [];
        const analyzers = Array.isArray(components.analyzers)
            ? components.analyzers.map((an) => ({ id: an.id, label: an.label, position: an.position, lensExclusionRadius: Math.max(0, an.lensExclusionRadius || 0) }))
            : [];
        return { lenses, analyzers };
    }
    function cloneSolution(solution) {
        if (!solution || typeof solution !== 'object') return null;
        const copy = { ...solution };
        copy.lenses = Array.isArray(solution.lenses)
            ? solution.lenses.map((lens, idx) => normalizeComponentLens(lens, idx)).filter(Boolean)
            : [];
        copy.lensCount = copy.lenses.length;
        if (typeof copy.modeMatching === 'number') {
            copy.modeMatching = clamp(copy.modeMatching, 0, 1);
        } else if (typeof copy.visibility === 'number') {
            const legacyAmp = clamp(copy.visibility, 0, 1);
            copy.modeMatching = legacyAmp * legacyAmp;
        } else {
            copy.modeMatching = 0;
        }
        if ('visibility' in copy) delete copy.visibility;
        return copy;
    }
    function downloadTextFile(filename, content, mime = 'text/plain') {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
    function exportPlotData() {
        const sortedLenses = getSortedLenses();
        const profile = computeBeamProfile(sortedLenses, 2000); // High resolution: 2000 points
        if (!profile.validation.isValid) {
            setSolverStatus(profile.validation.errors[0] || 'Plot data unavailable for invalid beam parameters', 'busy');
            return;
        }
        const continuousGouy = computeContinuousGouyPhaseProfile(profile);
        
        // Build CSV with headers
        let csv = 'Position (m),Spot Size (µm),Accumulated Gouy Phase (°)\n';
        for (let i = 0; i < profile.z.length; i++) {
            const z = profile.z[i];
            const w = profile.w[i];
            const gouy = continuousGouy[i] || 0;
            csv += `${z.toFixed(6)},${metersToMicrons(w).toFixed(4)},${(gouy * 180 / Math.PI).toFixed(4)}\n`;
        }
        
        downloadTextFile('beam_profile_data.csv', csv, 'text/csv');
    }
    function downloadPlot() {
        const sortedLenses = getSortedLenses();
        const profile = computeBeamProfile(sortedLenses, 2000); // High resolution: 2000 points
        if (!profile.validation.isValid) {
            setSolverStatus(profile.validation.errors[0] || 'Plot unavailable for invalid beam parameters', 'busy');
            return;
        }
        const continuousGouy = computeContinuousGouyPhaseProfile(profile);
        
        // SVG dimensions
        const width = 1200;
        const height = 800;
        
        // Plot margins
        const margin = { left: 100, right: 100, top: 60, bottom: 80 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        const plotX = margin.left;
        const plotY = margin.top;
        
        // Calculate data ranges
        const xMin = Math.min(...profile.z);
        const xMax = Math.max(...profile.z);
        const yMin1 = 0;
        const yMax1 = Math.max(...profile.w.map(w => metersToMicrons(w))) * 1.1;
        
        const gouyValues = continuousGouy.map((gouy) => gouy * 180 / Math.PI);
        const yMin2 = Math.min(...gouyValues);
        const yMax2 = Math.max(...gouyValues);
        
        // Coordinate transformation helpers
        const scaleX = (x) => plotX + ((x - xMin) / (xMax - xMin)) * plotWidth;
        const scaleY1 = (y) => plotY + plotHeight - ((y - yMin1) / (yMax1 - yMin1)) * plotHeight;
        const scaleY2 = (y) => plotY + plotHeight - ((y - yMin2) / (yMax2 - yMin2)) * plotHeight;
        
        // Create SVG element
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('xmlns', svgNS);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        // White background
        const background = document.createElementNS(svgNS, 'rect');
        background.setAttribute('width', width);
        background.setAttribute('height', height);
        background.setAttribute('fill', '#ffffff');
        svg.appendChild(background);
        
        // Grid layer
        const gridGroup = document.createElementNS(svgNS, 'g');
        gridGroup.setAttribute('id', 'grid');
        
        // Vertical grid lines
        const numXGridLines = 10;
        for (let i = 0; i <= numXGridLines; i++) {
            const x = plotX + (i / numXGridLines) * plotWidth;
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', plotY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', plotY + plotHeight);
            line.setAttribute('stroke', 'rgba(0, 0, 0, 0.1)');
            line.setAttribute('stroke-width', '0.5');
            gridGroup.appendChild(line);
        }
        
        // Horizontal grid lines
        const numYGridLines = 8;
        for (let i = 0; i <= numYGridLines; i++) {
            const y = plotY + (i / numYGridLines) * plotHeight;
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', plotX);
            line.setAttribute('y1', y);
            line.setAttribute('x2', plotX + plotWidth);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', 'rgba(0, 0, 0, 0.1)');
            line.setAttribute('stroke-width', '0.5');
            gridGroup.appendChild(line);
        }
        svg.appendChild(gridGroup);
        
        // Axes box
        const axesBox = document.createElementNS(svgNS, 'rect');
        axesBox.setAttribute('x', plotX);
        axesBox.setAttribute('y', plotY);
        axesBox.setAttribute('width', plotWidth);
        axesBox.setAttribute('height', plotHeight);
        axesBox.setAttribute('fill', 'none');
        axesBox.setAttribute('stroke', '#000000');
        axesBox.setAttribute('stroke-width', '1.5');
        svg.appendChild(axesBox);
        
        // Gouy phase line
        let gouyPath = `M ${scaleX(profile.z[0])} ${scaleY2(gouyValues[0])}`;
        for (let i = 1; i < profile.z.length; i++) {
            gouyPath += ` L ${scaleX(profile.z[i])} ${scaleY2(gouyValues[i])}`;
        }
        const gouyLine = document.createElementNS(svgNS, 'path');
        gouyLine.setAttribute('d', gouyPath);
        gouyLine.setAttribute('fill', 'none');
        gouyLine.setAttribute('stroke', '#e57373');
        gouyLine.setAttribute('stroke-width', '2');
        svg.appendChild(gouyLine);
        
        // Spot size fill
        let spotFillPath = `M ${scaleX(profile.z[0])} ${scaleY1(0)}`;
        for (let i = 0; i < profile.z.length; i++) {
            spotFillPath += ` L ${scaleX(profile.z[i])} ${scaleY1(metersToMicrons(profile.w[i]))}`;
        }
        spotFillPath += ` L ${scaleX(profile.z[profile.z.length - 1])} ${scaleY1(0)} Z`;
        const spotFill = document.createElementNS(svgNS, 'path');
        spotFill.setAttribute('d', spotFillPath);
        spotFill.setAttribute('fill', 'rgba(34, 95, 186, 0.2)');
        spotFill.setAttribute('stroke', 'none');
        svg.appendChild(spotFill);
        
        // Spot size line
        let spotPath = `M ${scaleX(profile.z[0])} ${scaleY1(metersToMicrons(profile.w[0]))}`;
        for (let i = 1; i < profile.z.length; i++) {
            spotPath += ` L ${scaleX(profile.z[i])} ${scaleY1(metersToMicrons(profile.w[i]))}`;
        }
        const spotLine = document.createElementNS(svgNS, 'path');
        spotLine.setAttribute('d', spotPath);
        spotLine.setAttribute('fill', 'none');
        spotLine.setAttribute('stroke', '#225fba');
        spotLine.setAttribute('stroke-width', '2.5');
        svg.appendChild(spotLine);
        
        // Target waist dashed line
        const targetY = scaleY1(metersToMicrons(state.target.waist));
        const targetLine = document.createElementNS(svgNS, 'line');
        targetLine.setAttribute('x1', plotX);
        targetLine.setAttribute('y1', targetY);
        targetLine.setAttribute('x2', plotX + plotWidth);
        targetLine.setAttribute('y2', targetY);
        targetLine.setAttribute('stroke', '#f97316');
        targetLine.setAttribute('stroke-width', '2');
        targetLine.setAttribute('stroke-dasharray', '8,4');
        svg.appendChild(targetLine);
        
        // Lens positions with labels
        for (const lens of sortedLenses) {
            const x = scaleX(lens.position);
            
            // Dashed vertical line
            const lensLine = document.createElementNS(svgNS, 'line');
            lensLine.setAttribute('x1', x);
            lensLine.setAttribute('y1', plotY);
            lensLine.setAttribute('x2', x);
            lensLine.setAttribute('y2', plotY + plotHeight);
            lensLine.setAttribute('stroke', '#555555');
            lensLine.setAttribute('stroke-width', '1.5');
            lensLine.setAttribute('stroke-dasharray', '6,3');
            svg.appendChild(lensLine);
            
            // Label box
            const lensLabel = lens.label || `${lens.type === 'mirror' ? 'M' : 'L'}`;
            const focalMm = metersToMillimeters(Math.abs(lens.focalLength));
            const sign = lens.focalLength < 0 ? '-' : '+';
            
            const boxWidth = 60;
            const boxHeight = 30;
            const boxX = x - boxWidth / 2;
            const boxY = plotY + 5;
            
            const labelBox = document.createElementNS(svgNS, 'rect');
            labelBox.setAttribute('x', boxX);
            labelBox.setAttribute('y', boxY);
            labelBox.setAttribute('width', boxWidth);
            labelBox.setAttribute('height', boxHeight);
            labelBox.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
            labelBox.setAttribute('stroke', '#555555');
            labelBox.setAttribute('stroke-width', '1');
            svg.appendChild(labelBox);
            
            const labelText1 = document.createElementNS(svgNS, 'text');
            labelText1.setAttribute('x', x);
            labelText1.setAttribute('y', boxY + 13);
            labelText1.setAttribute('text-anchor', 'middle');
            labelText1.setAttribute('font-family', 'Arial, sans-serif');
            labelText1.setAttribute('font-size', '12');
            labelText1.setAttribute('font-weight', 'bold');
            labelText1.setAttribute('fill', '#000000');
            labelText1.textContent = lensLabel;
            svg.appendChild(labelText1);
            
            const labelText2 = document.createElementNS(svgNS, 'text');
            labelText2.setAttribute('x', x);
            labelText2.setAttribute('y', boxY + 26);
            labelText2.setAttribute('text-anchor', 'middle');
            labelText2.setAttribute('font-family', 'Arial, sans-serif');
            labelText2.setAttribute('font-size', '10');
            labelText2.setAttribute('fill', '#000000');
            labelText2.textContent = `${sign}${focalMm.toFixed(0)}mm`;
            svg.appendChild(labelText2);
        }
        
        // X-axis label
        const xAxisLabel = document.createElementNS(svgNS, 'text');
        xAxisLabel.setAttribute('x', plotX + plotWidth / 2);
        xAxisLabel.setAttribute('y', height - 25);
        xAxisLabel.setAttribute('text-anchor', 'middle');
        xAxisLabel.setAttribute('font-family', 'Arial, sans-serif');
        xAxisLabel.setAttribute('font-size', '18');
        xAxisLabel.setAttribute('font-weight', 'bold');
        xAxisLabel.setAttribute('fill', '#000000');
        xAxisLabel.textContent = 'Position z (m)';
        svg.appendChild(xAxisLabel);
        
        // Left Y-axis label (rotated)
        const yAxisLabel1 = document.createElementNS(svgNS, 'text');
        yAxisLabel1.setAttribute('x', -plotY - plotHeight / 2);
        yAxisLabel1.setAttribute('y', 30);
        yAxisLabel1.setAttribute('text-anchor', 'middle');
        yAxisLabel1.setAttribute('font-family', 'Arial, sans-serif');
        yAxisLabel1.setAttribute('font-size', '18');
        yAxisLabel1.setAttribute('font-weight', 'bold');
        yAxisLabel1.setAttribute('fill', '#000000');
        yAxisLabel1.setAttribute('transform', 'rotate(-90)');
        yAxisLabel1.textContent = 'Spot size (µm)';
        svg.appendChild(yAxisLabel1);
        
        // Right Y-axis label (rotated)
        const yAxisLabel2 = document.createElementNS(svgNS, 'text');
        yAxisLabel2.setAttribute('x', plotY + plotHeight / 2);
        yAxisLabel2.setAttribute('y', -width + 30);
        yAxisLabel2.setAttribute('text-anchor', 'middle');
        yAxisLabel2.setAttribute('font-family', 'Arial, sans-serif');
        yAxisLabel2.setAttribute('font-size', '18');
        yAxisLabel2.setAttribute('font-weight', 'bold');
        yAxisLabel2.setAttribute('fill', '#c85a5a');
        yAxisLabel2.setAttribute('transform', 'rotate(90)');
        yAxisLabel2.textContent = 'Accumulated Gouy phase (°)';
        svg.appendChild(yAxisLabel2);
        
        // X-axis ticks
        const numXTicks = 10;
        for (let i = 0; i <= numXTicks; i++) {
            const x = plotX + (i / numXTicks) * plotWidth;
            const val = xMin + (i / numXTicks) * (xMax - xMin);
            
            const tick = document.createElementNS(svgNS, 'line');
            tick.setAttribute('x1', x);
            tick.setAttribute('y1', plotY + plotHeight);
            tick.setAttribute('x2', x);
            tick.setAttribute('y2', plotY + plotHeight + 6);
            tick.setAttribute('stroke', '#000000');
            tick.setAttribute('stroke-width', '1.5');
            svg.appendChild(tick);
            
            const tickLabel = document.createElementNS(svgNS, 'text');
            tickLabel.setAttribute('x', x);
            tickLabel.setAttribute('y', plotY + plotHeight + 20);
            tickLabel.setAttribute('text-anchor', 'middle');
            tickLabel.setAttribute('font-family', 'Arial, sans-serif');
            tickLabel.setAttribute('font-size', '14');
            tickLabel.setAttribute('fill', '#000000');
            tickLabel.textContent = val.toFixed(2);
            svg.appendChild(tickLabel);
        }
        
        // Left Y-axis ticks (spot size)
        const numYTicks1 = 8;
        for (let i = 0; i <= numYTicks1; i++) {
            const y = plotY + plotHeight - (i / numYTicks1) * plotHeight;
            const val = yMin1 + (i / numYTicks1) * (yMax1 - yMin1);
            
            const tick = document.createElementNS(svgNS, 'line');
            tick.setAttribute('x1', plotX - 6);
            tick.setAttribute('y1', y);
            tick.setAttribute('x2', plotX);
            tick.setAttribute('y2', y);
            tick.setAttribute('stroke', '#000000');
            tick.setAttribute('stroke-width', '1.5');
            svg.appendChild(tick);
            
            const tickLabel = document.createElementNS(svgNS, 'text');
            tickLabel.setAttribute('x', plotX - 10);
            tickLabel.setAttribute('y', y + 5);
            tickLabel.setAttribute('text-anchor', 'end');
            tickLabel.setAttribute('font-family', 'Arial, sans-serif');
            tickLabel.setAttribute('font-size', '14');
            tickLabel.setAttribute('fill', '#000000');
            tickLabel.textContent = val.toFixed(0);
            svg.appendChild(tickLabel);
        }
        
        // Right Y-axis ticks (Gouy phase)
        const numYTicks2 = 8;
        for (let i = 0; i <= numYTicks2; i++) {
            const y = plotY + plotHeight - (i / numYTicks2) * plotHeight;
            const val = yMin2 + (i / numYTicks2) * (yMax2 - yMin2);
            
            const tick = document.createElementNS(svgNS, 'line');
            tick.setAttribute('x1', plotX + plotWidth);
            tick.setAttribute('y1', y);
            tick.setAttribute('x2', plotX + plotWidth + 6);
            tick.setAttribute('y2', y);
            tick.setAttribute('stroke', '#c85a5a');
            tick.setAttribute('stroke-width', '1.5');
            svg.appendChild(tick);
            
            const tickLabel = document.createElementNS(svgNS, 'text');
            tickLabel.setAttribute('x', plotX + plotWidth + 10);
            tickLabel.setAttribute('y', y + 5);
            tickLabel.setAttribute('text-anchor', 'start');
            tickLabel.setAttribute('font-family', 'Arial, sans-serif');
            tickLabel.setAttribute('font-size', '14');
            tickLabel.setAttribute('fill', '#c85a5a');
            tickLabel.textContent = val.toFixed(1);
            svg.appendChild(tickLabel);
        }
        
        // Convert SVG to string and download
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'beam_profile.svg';
        link.click();
        URL.revokeObjectURL(url);
    }
    function escapeCsvCell(value) {
        const text = `${value ?? ''}`;
        if (text.includes(',') || text.includes('\n') || text.includes('"')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }
    function buildLibraryCsv(entries) {
        const header = 'Label,Focal Length (mm)';
        const rows = entries.map((lens) => `${escapeCsvCell(lens.label || '')},${Number(lens.focalLengthMm).toString()}`);
        return [header, ...rows].join('\n');
    }
    function parseCsvLine(line) {
        if (typeof line !== 'string') return [];
        const cells = [];
        const regex = /(?:"([^"\\]*(?:""[^"\\]*)*)"|([^,]*))(?:,|$)/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const matchLength = match[0]?.length ?? 0;
            if (matchLength === 0) {
                // Guard against zero-width matches (e.g., trailing whitespace) that would otherwise loop forever.
                break;
            }
            const value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
            cells.push(value.trim());
        }
        return cells;
    }
    function parseFocalCell(cell) {
        if (cell === undefined || cell === null) return NaN;
        let text = `${cell}`.trim();
        if (!text) return NaN;
        text = text.replace(/[−-]/g, '-');
        if (/^\((.*)\)$/.test(text)) {
            text = `-${RegExp.$1}`;
        }
        text = text.replace(/mm$/i, '').trim();
        const hasComma = text.includes(',');
        const hasDot = text.includes('.');
        if (hasComma && !hasDot) {
            text = text.replace(',', '.');
        } else {
            text = text.replace(/,/g, '');
        }
        text = text.replace(/\s+/g, '');
        return Number(text);
    }
    function parseLibraryCsv(text) {
        if (typeof text !== 'string' || !text.trim()) return [];
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
        if (!lines.length) return [];
        const entries = [];
        const startIndex = lines[0].toLowerCase().includes('label') ? 1 : 0;
        for (let i = startIndex; i < lines.length; i++) {
            const cells = parseCsvLine(lines[i]);
            if (cells.length < 2) continue;
            const label = cells[0] || '';
            const focal = parseFocalCell(cells[1]);
            if (!Number.isFinite(focal) || Math.abs(focal) < 1e-3) continue;
            entries.push({ label, focalLengthMm: focal });
        }
        return entries;
    }
    function base64EncodeUnicode(str) {
        if (typeof btoa !== 'function') return encodeURIComponent(str);
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    }
    function base64DecodeUnicode(str) {
        if (typeof atob !== 'function') return decodeURIComponent(str);
        try {
            const binary = atob(str);
            const percentEncoded = Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
            return decodeURIComponent(percentEncoded);
        } catch (error) {
            return null;
        }
    }
    function tryParseConfigPayload(raw) {
        if (typeof raw !== 'string' || !raw.trim()) return null;
        let param;
        try {
            param = decodeURIComponent(raw);
        } catch (error) {
            param = raw;
        }
        const decoded = base64DecodeUnicode(param) || param;
        try {
            return JSON.parse(decoded);
        } catch (error) {
            return null;
        }
    }
    function copyToClipboard(text) {
        if (navigator.clipboard?.writeText) {
            return navigator.clipboard.writeText(text).catch(() => {
                const temp = document.createElement('textarea');
                temp.value = text;
                temp.style.position = 'fixed';
                temp.style.opacity = '0';
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            });
        }
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        return Promise.resolve();
    }
    function syncStateToInputs() {
        if (dom.initialWaist) {
            const waistMicrons = metersToMicrons(state.initial.waist);
            dom.initialWaist.value = Number.isFinite(waistMicrons) ? parseFloat(waistMicrons.toFixed(3)).toString() : '0';
        }
        if (dom.initialWaistZ) dom.initialWaistZ.value = Number.isFinite(state.initial.waistZ) ? state.initial.waistZ : 0;
        if (dom.initialLambda) {
            const lambdaNm = state.initial.lambda * 1e9;
            dom.initialLambda.value = Number.isFinite(lambdaNm) ? lambdaNm.toFixed(0) : '1064';
        }
        if (dom.referencePlane) dom.referencePlane.value = Number.isFinite(state.initial.reference) ? state.initial.reference : 0;
        if (dom.targetWaist) dom.targetWaist.value = parseFloat(metersToMicrons(state.target.waist).toFixed(3)).toString();
        if (dom.targetWaistZ) dom.targetWaistZ.value = Number.isFinite(state.target.waistZ) ? state.target.waistZ : 0;
        if (dom.targetWaistTolerance) dom.targetWaistTolerance.value = parseFloat(metersToMicrons(state.target.waistTolerance).toFixed(3)).toString();
        if (dom.targetPositionTolerance) dom.targetPositionTolerance.value = parseFloat(metersToMillimeters(state.target.positionTolerance).toFixed(3)).toString();
        if (dom.solverLensCount) dom.solverLensCount.value = state.solver.lensCount;
        if (dom.solverZMin) dom.solverZMin.value = state.solver.zMin;
        if (dom.solverZMax) dom.solverZMax.value = state.solver.zMax;
        if (dom.solverGridSteps) dom.solverGridSteps.value = state.solver.gridSteps;
        if (dom.solverModeMatch) dom.solverModeMatch.value = (state.solver.minModeMatch * 100).toFixed(0);
        if (dom.solverAllowDuplicates) dom.solverAllowDuplicates.value = state.solver.allowDuplicates ? 'true' : 'false';
        if (dom.solverLensSpacing) {
            const cm = metersToCentimeters(Math.max(0, state.solver.minLensSpacing || 0));
            dom.solverLensSpacing.value = Number.isFinite(cm) ? parseFloat(cm.toFixed(3)).toString() : '0';
        }
        if (dom.solverClearBeforeSearch) dom.solverClearBeforeSearch.value = state.solver.clearBeforeSearch ? 'true' : 'false';
    }
    function applyConfigurationPayload(data) {
        if (!data || typeof data !== 'object') throw new Error('Invalid configuration payload');
        if (data.initial) {
            if (Number.isFinite(data.initial.waist)) state.initial.waist = data.initial.waist;
            if (Number.isFinite(data.initial.waistZ)) state.initial.waistZ = data.initial.waistZ;
            if (Number.isFinite(data.initial.lambda)) state.initial.lambda = data.initial.lambda;
            if (Number.isFinite(data.initial.reference)) state.initial.reference = data.initial.reference;
        }
        if (data.target) {
            if (Number.isFinite(data.target.waist)) state.target.waist = data.target.waist;
            if (Number.isFinite(data.target.waistZ)) state.target.waistZ = data.target.waistZ;
            if (Number.isFinite(data.target.waistTolerance)) state.target.waistTolerance = Math.max(0, data.target.waistTolerance);
            if (Number.isFinite(data.target.positionTolerance)) state.target.positionTolerance = Math.max(0, data.target.positionTolerance);
        }
        if (data.components) {
            const normalizedLenses = Array.isArray(data.components.lenses)
                ? data.components.lenses.map((lens, idx) => normalizeComponentLens(lens, idx)).filter(Boolean)
                : [];
            const normalizedAnalyzers = Array.isArray(data.components.analyzers)
                ? data.components.analyzers.map((an, idx) => normalizeAnalyzerEntry(an, idx)).filter(Boolean)
                : [];
            state.components = { lenses: normalizedLenses, analyzers: normalizedAnalyzers };
        } else {
            state.components = { lenses: [], analyzers: [] };
        }
        if (data.solver) {
            if (Number.isFinite(data.solver.lensCount)) state.solver.lensCount = clamp(Math.round(data.solver.lensCount), 1, 6);
            if (Number.isFinite(data.solver.zMin)) state.solver.zMin = data.solver.zMin;
            if (Number.isFinite(data.solver.zMax)) state.solver.zMax = data.solver.zMax;
            if (Number.isFinite(data.solver.gridSteps)) state.solver.gridSteps = clamp(Math.round(data.solver.gridSteps), 3, 300);
            if (Number.isFinite(data.solver.minModeMatch)) {
                state.solver.minModeMatch = clamp(data.solver.minModeMatch, 0, 1);
            } else if (Number.isFinite(data.solver.visibility)) {
                const legacyAmp = clamp(data.solver.visibility, 0, 1);
                state.solver.minModeMatch = legacyAmp * legacyAmp;
            }
            if (typeof data.solver.allowDuplicates === 'boolean') state.solver.allowDuplicates = data.solver.allowDuplicates;
            if (typeof data.solver.clearBeforeSearch === 'boolean') state.solver.clearBeforeSearch = data.solver.clearBeforeSearch;
            if (Number.isFinite(data.solver.minLensSpacing)) {
                state.solver.minLensSpacing = Math.max(0, data.solver.minLensSpacing);
            }
        }
        if (!Number.isFinite(state.solver.minLensSpacing) || state.solver.minLensSpacing < 0) {
            state.solver.minLensSpacing = centimetersToMeters(2);
        }
        const hasLibraryField = Object.prototype.hasOwnProperty.call(data, 'library');
        const hasCustomField = Object.prototype.hasOwnProperty.call(data, 'customLibrary');
        if (Array.isArray(data.library)) {
            state.library = data.library.map((entry) => normalizeLibraryEntry(entry)).filter(Boolean);
        } else if (Array.isArray(data.customLibrary)) {
            state.library = data.customLibrary.map((entry) => normalizeLibraryEntry(entry)).filter(Boolean);
        } else if (!hasLibraryField && !hasCustomField) {
            state.library = buildBuiltinLibrary();
        } else {
            state.library = [];
        }
        if (!state.library.length) {
            state.library = buildBuiltinLibrary();
        }
        state.librarySequence = computeLibrarySequence(state.library);
        if (Array.isArray(data.solutions)) {
            state.solutions = data.solutions.map((solution) => cloneSolution(solution)).filter(Boolean);
        } else {
            state.solutions = [];
        }
        state.selectedSolutionId = typeof data.selectedSolutionId === 'string' ? data.selectedSolutionId : (state.solutions[0]?.id ?? null);
        renderLibraryTable();
        syncStateToInputs();
        resetLensForm(true);
        refreshAll();
    }
    function setSolverStatus(text, tone = 'default') {
        dom.solverStatus.textContent = text;
        dom.solverStatus.style.background = tone === 'busy' ? 'rgba(249, 115, 22, 0.12)' : tone === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(34, 95, 186, 0.12)';
        dom.solverStatus.style.color = tone === 'busy' ? '#9a3412' : tone === 'success' ? '#047857' : '#1d4ed8';
    }
    function getSortedLenses() { return [...state.components.lenses].sort((a, b) => a.position - b.position); }
    function buildRawOpticalSystem(lensesOverride = null) {
        return {
            initial: { ...state.initial },
            target: { ...state.target },
            components: {
                lenses: Array.isArray(lensesOverride)
                    ? lensesOverride.map((lens) => ({ ...lens }))
                    : state.components.lenses.map((lens) => ({ ...lens })),
                analyzers: state.components.analyzers.map((analyzer) => ({ ...analyzer }))
            }
        };
    }
    function computeProfileRange(sortedLenses) {
        const candidatePositions = [state.initial.reference];
        if (Number.isFinite(state.target.waistZ)) candidatePositions.push(state.target.waistZ);
        for (const lens of sortedLenses) candidatePositions.push(lens.position);
        for (const analyzer of state.components.analyzers) candidatePositions.push(analyzer.position);

        const customLimits = state.canvas.customLimits || { xMin: null, xMax: null };
        let spanMin = Math.min(...candidatePositions, state.initial.reference);
        let spanMax = Math.max(...candidatePositions, state.initial.reference + 0.5);
        if (Number.isFinite(customLimits.xMin)) spanMin = Math.min(spanMin, customLimits.xMin);
        if (Number.isFinite(customLimits.xMax)) spanMax = Math.max(spanMax, customLimits.xMax);

        const padding = Math.max(0.02, (spanMax - spanMin) * 0.08);
        let zMin = spanMin - padding;
        let zMax = spanMax + padding;
        if (Number.isFinite(customLimits.xMin)) zMin = Math.min(zMin, customLimits.xMin);
        if (Number.isFinite(customLimits.xMax)) zMax = Math.max(zMax, customLimits.xMax);
        if (!Number.isFinite(zMin)) zMin = spanMin - padding;
        if (!Number.isFinite(zMax) || zMax <= zMin) zMax = zMin + Math.max(0.1, padding * 2);
        return { min: zMin, max: zMax };
    }
    function resolveProfileSampleCount(samples) {
        const customLimits = state.canvas.customLimits || { xMin: null, xMax: null };
        const hasCustomLimits = Number.isFinite(customLimits.xMin) || Number.isFinite(customLimits.xMax);
        const viewportWidth = Math.max(dom.beamCanvas?.clientWidth || 0, dom.beamChart?.clientWidth || 0, 900);
        const minimumSamples = hasCustomLimits ? Math.ceil(viewportWidth * 2.8) : Math.ceil(viewportWidth * 1.8);
        return Math.max(samples, minimumSamples, hasCustomLimits ? 1800 : 1200);
    }
    function queryBeamState(profile, z) {
        if (!profile || !Number.isFinite(z)) return null;
        const sample = optics.queryTraceAtZ(profile, z);
        if (!sample) return null;
        const gouyAnchor = Number.isFinite(profile.gouyAnchor) ? profile.gouyAnchor : 0;
        return { ...sample, gouy: sample.gouy - gouyAnchor };
    }
    function computeBeamProfile(sortedLenses, samples = 360, options = {}) {
        const lenses = Array.isArray(sortedLenses) ? sortedLenses : getSortedLenses();
        const sampleRange = computeProfileRange(lenses);
        const normalized = optics.normalizeSystem(buildRawOpticalSystem(lenses));
        const trace = optics.traceSystem(normalized, {
            sampleRange,
            sampleCount: resolveProfileSampleCount(samples),
            anchorPositions: options.anchorPositions || []
        });
        trace.lambda = normalized.initial.lambda;
        if (!trace.validation.isValid) {
            trace.rangeMin = sampleRange.min;
            trace.rangeMax = sampleRange.max;
            trace.displayMin = sampleRange.min;
            trace.displayMax = sampleRange.max;
            trace.z = [sampleRange.min, sampleRange.max];
            trace.w = [Number.NaN, Number.NaN];
            trace.q = [];
            trace.continuousGouy = [Number.NaN, Number.NaN];
            trace.maxW = state.initial.waist || 1e-6;
            trace.gouyAnchor = 0;
        } else {
            trace.gouyAnchor = Number.isFinite(trace.samples?.[0]?.gouy) ? trace.samples[0].gouy : 0;
            trace.continuousGouy = trace.samples.map((sample) => sample.gouy - trace.gouyAnchor);
        }
        return trace;
    }
    function extractBeamMetrics(q, lambda) {
        return optics.extractBeamMetrics(q, lambda);
    }
    function computeAbsoluteGouyAtZ(targetZ, profile = state.lastTrace) {
        const sample = queryBeamState(profile, targetZ);
        return Number.isFinite(sample?.gouy) ? sample.gouy : null;
    }
    function computeContinuousGouyAtZ(targetZ, profile = state.lastTrace, anchorZ = null) {
        const absolute = computeAbsoluteGouyAtZ(targetZ, profile);
        if (!Number.isFinite(absolute)) return null;
        if (!Number.isFinite(anchorZ)) return absolute;
        const anchor = computeAbsoluteGouyAtZ(anchorZ, profile);
        if (!Number.isFinite(anchor)) return absolute;
        return absolute - anchor;
    }
    function computeContinuousGouyPhaseProfile(profile) {
        if (!profile || !Array.isArray(profile.continuousGouy)) return [];
        return profile.continuousGouy;
    }
    function interpolateProfileValue(profile, values, targetZ) {
        if (!profile || !Array.isArray(profile.z) || !Array.isArray(values) || profile.z.length !== values.length || !profile.z.length || !Number.isFinite(targetZ)) return null;
        const zValues = profile.z;
        if (targetZ <= zValues[0]) return Number.isFinite(values[0]) ? values[0] : null;
        const lastIndex = zValues.length - 1;
        if (targetZ >= zValues[lastIndex]) return Number.isFinite(values[lastIndex]) ? values[lastIndex] : null;
        let low = 0;
        let high = lastIndex;
        while (high - low > 1) {
            const mid = Math.floor((low + high) / 2);
            if (zValues[mid] <= targetZ) low = mid;
            else high = mid;
        }
        const z0 = zValues[low];
        const z1 = zValues[high];
        const v0 = values[low];
        const v1 = values[high];
        if (!Number.isFinite(z0) || !Number.isFinite(z1) || !Number.isFinite(v0) || !Number.isFinite(v1)) return null;
        const span = z1 - z0;
        if (Math.abs(span) < 1e-12) return v0;
        const t = (targetZ - z0) / span;
        return v0 + (v1 - v0) * t;
    }
    function findOutputWaist(sortedLenses, profile) {
        if (!profile?.outputWaist) return { w0: Number.NaN, waistZ0: Number.NaN };
        return { w0: profile.outputWaist.w, waistZ0: profile.outputWaist.z };
    }
    function renderLensTable() {
        const lenses = state.components.lenses; if (!lenses.length) { dom.lensTable.className = 'mm-empty-state'; dom.lensTable.innerHTML = 'No lenses yet. Add one to begin.'; return; }
        const rows = lenses.sort((a, b) => a.position - b.position).map((lens) => {
            const isMirror = lens.type === 'mirror';
            const fmm = metersToMillimeters(Math.abs(lens.focalLength)); const symbol = lens.focalLength < 0 ? '−' : '';
            const rowClass = lens.id === state.editingLensId ? ' class="mm-editing"' : '';
            const typeLabel = isMirror ? 'Mirror' : 'Lens';
            const label = lens.label || `${typeLabel} ${symbol}${formatNumber(fmm, { precision: 1, trim: true })} mm`;
            let focalInfo;
            if (isMirror && lens.roc) {
                const rocMm = metersToMillimeters(Math.abs(lens.roc));
                focalInfo = `R=${symbol}${formatNumber(rocMm, { precision: 2, unit: 'mm' })} (f=${symbol}${formatNumber(fmm, { precision: 2, unit: 'mm' })})`;
            } else {
                focalInfo = `${symbol}${formatNumber(fmm, { precision: 2, unit: 'mm' })}`;
            }
            return `<tr data-id="${lens.id}"${rowClass}><td><div>${label}</div><div class="mm-tag-muted">${lens.id}</div></td><td>${focalInfo}</td><td>${formatNumber(lens.position, { precision: 3, unit: 'm' })}</td><td><div class="mm-table-actions"><button type="button" data-action="edit-lens" title="Edit this ${typeLabel.toLowerCase()}">Edit</button><button type="button" class="mm-button-ghost" data-action="remove-lens" title="Remove this ${typeLabel.toLowerCase()}">Remove</button></div></td></tr>`;
        }).join('');
        const table = `<table><thead><tr><th>Name</th><th>focal length</th><th>position z</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
        dom.lensTable.className = ''; dom.lensTable.innerHTML = table;
    }
    function renderAnalyzerTable(sortedLenses, profile = null) {
        const analyzers = state.components.analyzers;
        if (!analyzers.length) { dom.analyzerTable.className = 'mm-empty-state'; dom.analyzerTable.innerHTML = 'Add analyzers to probe the beam along the optical path.'; return; }
        const workingProfile = profile || computeBeamProfile(sortedLenses, Math.max(720, analyzers.length * 32));
        const rows = analyzers.sort((a, b) => a.position - b.position).map((an) => {
            const sample = queryBeamState(workingProfile, an.position);
            const metrics = sample?.metrics || { w: Number.NaN, R: Number.NaN };
            const continuousGouyAtAnalyzer = sample?.gouy;
            const exclusion = Math.max(0, an.lensExclusionRadius || 0);
            const exclusionTag = exclusion > 0 ? `±${formatNumber(metersToCentimeters(exclusion), { precision: 2, unit: 'cm' })}` : '-';
            const gouyDegrees = Number.isFinite(continuousGouyAtAnalyzer) ? continuousGouyAtAnalyzer * 180 / Math.PI : null;
            return `<tr data-id="${an.id}"><td>${an.label || an.id}</td><td>${formatNumber(an.position, { precision: 3, unit: 'm' })}</td><td>${formatNumber(metersToMicrons(metrics.w), { precision: 2, unit: 'µm' })}</td><td>${metrics.R === Infinity ? '∞' : formatNumber(metrics.R, { precision: 2, unit: 'm' })}</td><td>${Number.isFinite(gouyDegrees) ? formatNumber(gouyDegrees, { precision: 2, unit: '°' }) : 'N/A'}</td><td>${exclusionTag}</td><td><button type="button" class="mm-button-ghost" data-action="remove-analyzer" aria-label="Remove analyzer" title="Remove analyzer">×</button></td></tr>`;
        }).join('');
        const table = `<table><thead><tr><th>Name</th><th>position z</th><th>Spot size</th><th>Wavefront ROC</th><th>Accum. Gouy phase</th><th>Lens exc</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
        dom.analyzerTable.className = ''; dom.analyzerTable.innerHTML = table;
    }
    function initChart() {
        if (!window.Chart) return null;
        // Register a subtle vertical hover line similar to the Steinhart-Hart chart
        const hoverLinePlugin = {
            id: 'hoverLine',
            afterDatasetsDraw(chart) {
                const active = chart.tooltip?._active; if (!active || !active.length) return;
                const ctx = chart.ctx; const x = active[0].element.x; const { top, bottom } = chart.chartArea;
                ctx.save();
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
                ctx.restore();
            }
        };
        if (!Chart.registry.plugins.get('hoverLine')) {
            Chart.register(hoverLinePlugin);
        }

        // Global-ish cosmetics for nicer defaults
        Chart.defaults.color = '#334155';
        Chart.defaults.font.family = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
        Chart.defaults.font.size = 12;
        Chart.defaults.devicePixelRatio = Math.min(3, Math.max(window.devicePixelRatio || 1, 2));

        const ctx = dom.beamChart.getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Accumulated Gouy phase',
                        data: [],
                        borderColor: '#e57373',
                        pointRadius: 0,
                        fill: false,
                        cubicInterpolationMode: 'monotone',
                        tension: 0.16,
                        spanGaps: true,
                        borderWidth: 2,
                        yAxisID: 'y2'
                    },
                    {
                        label: 'Target waist',
                        data: [],
                        borderColor: '#f97316',
                        borderDash: [6, 6],
                        pointRadius: 0,
                        fill: false,
                        borderWidth: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Spot size w(z)',
                        data: [],
                        borderColor: '#225fba',
                        backgroundColor: 'rgba(34, 95, 186, 0.18)',
                        fill: true,
                        cubicInterpolationMode: 'monotone',
                        tension: 0.16,
                        spanGaps: true,
                        pointRadius: 0,
                        borderWidth: 2,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                normalized: true,
                interaction: { mode: 'nearest', intersect: false, axis: 'x' },
                layout: { padding: { left: 6, right: 6, top: 4, bottom: 2 } },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 10, boxHeight: 10, color: '#334155' }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: false,
                        axis: 'x',
                        backgroundColor: 'rgba(11, 18, 32, 0.92)',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(148,163,184,0.35)',
                        borderWidth: 1,
                        padding: 8,
                        displayColors: true
                    }
                },
                elements: { line: { borderJoinStyle: 'round' }, point: { radius: 0, hitRadius: 6 } },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Position z (m)', color: '#334155', font: { weight: '600' } },
                        grid: { color: 'rgba(148,163,184,0.25)', drawBorder: false },
                        ticks: { 
                            color: '#475569',
                            maxTicksLimit: 15
                        }
                    },
                    y: {
                        position: 'left',
                        title: { display: true, text: 'Spot size (µm)', color: '#334155', font: { weight: '600' } },
                        grid: { color: 'rgba(148,163,184,0.25)', drawBorder: false },
                        ticks: { 
                            color: '#475569',
                            maxTicksLimit: 12
                        }
                    },
                    y2: {
                        position: 'right',
                        title: { display: true, text: 'Accumulated Gouy phase (°)', color: '#c85a5a', font: { weight: '600' } },
                        grid: { display: false },
                        ticks: { 
                            color: '#c85a5a',
                            maxTicksLimit: 10
                        }
                    }
                },
                animation: { duration: 250 }
            }
        });
    }
    function updateChart(profile) {
        if (!state.chart) return;
        const beamData = profile.z.map((z, i) => ({
            x: Number(z),
            y: Number.isFinite(profile.w[i]) ? metersToMicrons(profile.w[i]) : null
        }));
        const targetLine = profile.z.map((z) => ({
            x: Number(z),
            y: metersToMicrons(state.target.waist)
        }));
        // Set x-axis limits to match data range exactly (no whitespace)
        const xMin = profile.displayMin;
        const xMax = profile.displayMax;
        
        // Calculate nice step size
        const range = xMax - xMin;
        const desiredSteps = 10;
        let stepSize = range / desiredSteps;
        // Round to nice values: 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, etc.
        const magnitude = Math.pow(10, Math.floor(Math.log10(stepSize)));
        const normalized = stepSize / magnitude;
        if (normalized <= 1) stepSize = magnitude;
        else if (normalized <= 2) stepSize = 2 * magnitude;
        else if (normalized <= 5) stepSize = 5 * magnitude;
        else stepSize = 10 * magnitude;
        
        // Adjust min/max to align with step boundaries to ensure clean ticks
        const adjustedMin = Math.floor(xMin / stepSize) * stepSize;
        const adjustedMax = Math.ceil(xMax / stepSize) * stepSize;
        const gouyData = profile.z.map((z, i) => ({
            x: Number(z),
            y: Number.isFinite(profile.continuousGouy[i]) ? profile.continuousGouy[i] * 180 / Math.PI : null
        }));
        state.chart.data.datasets[0].data = gouyData;
        state.chart.data.datasets[1].data = targetLine;
        state.chart.data.datasets[2].data = beamData;
        const nominalSpacing = profile.z.length > 1
            ? Math.max((profile.z[profile.z.length - 1] - profile.z[0]) / (profile.z.length - 1), 1e-6)
            : Math.max(range / 200, 1e-6);
        const buildEdgeSamples = (startZ, endZ) => {
            if (!Number.isFinite(startZ) || !Number.isFinite(endZ) || endZ <= startZ + 1e-12) return [];
            const segments = Math.max(8, Math.ceil((endZ - startZ) / nominalSpacing));
            const points = [];
            for (let i = 0; i <= segments; i++) {
                points.push(startZ + (endZ - startZ) * (i / segments));
            }
            return points;
        };
        const sampleBeamPoint = (z) => {
            const sample = queryBeamState(profile, z);
            const w = sample?.metrics?.w;
            const gouy = sample?.gouy;
            return {
                beam: { x: z, y: Number.isFinite(w) ? metersToMicrons(w) : null },
                target: { x: z, y: metersToMicrons(state.target.waist) },
                gouy: { x: z, y: Number.isFinite(gouy) ? gouy * 180 / Math.PI : null }
            };
        };
        
        // Extend data to fill the adjusted axis range
        if (adjustedMin < xMin) {
            const leftSamples = buildEdgeSamples(adjustedMin, xMin).slice(0, -1).map((z) => sampleBeamPoint(z));
            if (leftSamples.length) {
                beamData.unshift(...leftSamples.map((sample) => sample.beam));
                targetLine.unshift(...leftSamples.map((sample) => sample.target));
                gouyData.unshift(...leftSamples.map((sample) => sample.gouy));
            }
        }
        if (adjustedMax > xMax) {
            const rightSamples = buildEdgeSamples(xMax, adjustedMax).slice(1).map((z) => sampleBeamPoint(z));
            if (rightSamples.length) {
                beamData.push(...rightSamples.map((sample) => sample.beam));
                targetLine.push(...rightSamples.map((sample) => sample.target));
                gouyData.push(...rightSamples.map((sample) => sample.gouy));
            }
        }
        
        // Update datasets with extended data
        state.chart.data.datasets[0].data = gouyData;
        state.chart.data.datasets[1].data = targetLine;
        state.chart.data.datasets[2].data = beamData;
        
        state.chart.options.scales.x.min = adjustedMin;
        state.chart.options.scales.x.max = adjustedMax;
        state.chart.options.scales.x.ticks.stepSize = stepSize;
        state.chart.update('none');
    }
    function drawLensGraphic(ctx, x, topY, bottomY, lens, locked) {
        const isMirror = lens.type === 'mirror';
        const halfWidth = 8; const midY = (topY + bottomY) / 2; const height = bottomY - topY;
        const convexCurve = halfWidth * 1.25; const concaveInset = halfWidth * 1.05; const isConvex = lens.focalLength >= 0;
        
        if (isMirror) {
            const mirrorThickness = 8;
            const reflectiveX = x + mirrorThickness * 0.45;
            const backX = x - mirrorThickness * 0.45;
            const faceControlX = isConvex ? reflectiveX + halfWidth * 1.15 : reflectiveX - halfWidth * 1.05;

            ctx.beginPath();
            ctx.moveTo(backX, topY);
            ctx.lineTo(backX, bottomY);
            ctx.lineTo(reflectiveX, bottomY);
            ctx.quadraticCurveTo(faceControlX, midY, reflectiveX, topY);
            ctx.closePath();
            ctx.fillStyle = locked ? 'rgba(59, 130, 246, 0.68)' : 'rgba(37, 99, 235, 0.74)';
            ctx.strokeStyle = locked ? 'rgba(37, 99, 235, 0.82)' : 'rgba(29, 78, 216, 0.9)';
            ctx.lineWidth = 1.1;
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(reflectiveX, topY + 2);
            ctx.quadraticCurveTo(faceControlX, midY, reflectiveX, bottomY - 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(backX + 1.4, topY + Math.max(4, 0.18 * height));
            ctx.lineTo(backX + 1.4, bottomY - Math.max(4, 0.18 * height));
            ctx.stroke();
            ctx.restore();
        } else {
            // Draw lens (existing code)
            ctx.beginPath(); ctx.moveTo(x - halfWidth, topY);
            if (isConvex) { ctx.quadraticCurveTo(x - halfWidth - convexCurve, midY, x - halfWidth, bottomY); }
            else { ctx.quadraticCurveTo(x - halfWidth + concaveInset, midY, x - halfWidth, bottomY); }
            ctx.lineTo(x + halfWidth, bottomY);
            if (isConvex) { ctx.quadraticCurveTo(x + halfWidth + convexCurve, midY, x + halfWidth, topY); }
            else { ctx.quadraticCurveTo(x + halfWidth - concaveInset, midY, x + halfWidth, topY); }
            ctx.closePath(); const bodyColor = locked ? 'rgba(59, 130, 246, 0.78)' : 'rgba(37, 99, 235, 0.82)';
            ctx.fillStyle = bodyColor; ctx.strokeStyle = locked ? 'rgba(37, 99, 235, 0.9)' : 'rgba(29, 78, 216, 0.9)'; ctx.lineWidth = 1; ctx.fill(); ctx.stroke();
            ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, topY + Math.max(4, 0.2 * height)); ctx.lineTo(x, bottomY - Math.max(4, 0.2 * height)); ctx.stroke(); ctx.restore();
        }
    }
    function drawCanvas(profile, sortedLenses) {
        const canvas = dom.beamCanvas; if (!canvas) return; const ctx = canvas.getContext('2d');
        const pixelRatio = window.devicePixelRatio || 1; const displayWidth = canvas.clientWidth || canvas.width; const displayHeight = canvas.clientHeight || canvas.height; if (!displayWidth || !displayHeight) return;
        const requiredWidth = Math.round(displayWidth * pixelRatio); const requiredHeight = Math.round(displayHeight * pixelRatio);
        if (canvas.width !== requiredWidth || canvas.height !== requiredHeight) { canvas.width = requiredWidth; canvas.height = requiredHeight; }
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); ctx.clearRect(0, 0, displayWidth, displayHeight);
        const width = displayWidth; const height = displayHeight;
        const basePadding = Math.max(20, width * 0.025);
        const yAxisReserve = Math.max(28, Math.min(40, width * 0.035));
        const paddingLeft = basePadding + yAxisReserve;
        const paddingRight = basePadding; const paddingTop = 32; const paddingBottom = 76;
        let lensTop = paddingTop; let lensBottom = height - paddingBottom; if (lensBottom <= lensTop + 40) { lensBottom = lensTop + 40; }
        const axisY = (lensTop + lensBottom) / 2;
        const { rangeMin, rangeMax, maxW } = profile;
        const customLimits = state.canvas.customLimits || { xMin: null, xMax: null };
        let effectiveRangeMin = Number.isFinite(customLimits.xMin) ? customLimits.xMin : rangeMin;
        let effectiveRangeMax = Number.isFinite(customLimits.xMax) ? customLimits.xMax : rangeMax;
        if (!Number.isFinite(effectiveRangeMax) || effectiveRangeMax <= effectiveRangeMin) {
            effectiveRangeMax = effectiveRangeMin + Math.max(0.001, rangeMax - rangeMin);
        }
        const span = Math.max(effectiveRangeMax - effectiveRangeMin, 1e-6);
        const usableWidth = Math.max(1, width - paddingLeft - paddingRight);
        const pxPerMeter = usableWidth / span;
        
        // When autoscaling, only consider w values within the visible range
        let visibleMaxW = state.target.waist;
        if (state.autoScaleY) {
            for (let i = 0; i < profile.w.length; i++) {
                const z = profile.z[i];
                const w = profile.w[i];
                if (Number.isFinite(z) && Number.isFinite(w) && z >= effectiveRangeMin && z <= effectiveRangeMax) {
                    visibleMaxW = Math.max(visibleMaxW, w);
                }
            }
        }
        
        const dynamicMaxRadius = Math.max(visibleMaxW, state.target.waist) || 1e-4;
        state.canvas.lastMaxRadius = dynamicMaxRadius;
        const manualYLimit = state.canvas.customLimits?.yLimit;
        const manualLimitActive = Number.isFinite(manualYLimit) && manualYLimit > 0;
        const autoBaseline = state.autoScaleY
            ? dynamicMaxRadius
            : (Number.isFinite(state.canvas.lockedMaxRadius) && state.canvas.lockedMaxRadius > 0
                ? state.canvas.lockedMaxRadius
                : dynamicMaxRadius);
        const effectiveMaxRadius = manualLimitActive ? manualYLimit : autoBaseline;
        const maxRadius = Math.max(effectiveMaxRadius, 1e-6);
        const radialHalfSpan = Math.max(24, (lensBottom - lensTop) / 2);
        const pxPerMeterRadial = radialHalfSpan / (maxRadius * 1.3);
        const zToX = (z) => paddingLeft + (z - effectiveRangeMin) * pxPerMeter;
        const wToYoffsetPx = (w) => w * pxPerMeterRadial;
        const topBoundaryY = axisY - radialHalfSpan;
        const bottomBoundaryY = axisY + radialHalfSpan;

        const drawOverflowArrow = (x, baseY, direction) => {
            const arrowHeight = 10;
            const arrowHalfWidth = 6;
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.strokeStyle = 'rgba(185, 28, 28, 0.85)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (direction === 'up') {
                const tipY = baseY - arrowHeight;
                ctx.moveTo(x, tipY);
                ctx.lineTo(x - arrowHalfWidth, baseY);
                ctx.lineTo(x + arrowHalfWidth, baseY);
            } else {
                const tipY = baseY + arrowHeight;
                ctx.moveTo(x, tipY);
                ctx.lineTo(x - arrowHalfWidth, baseY);
                ctx.lineTo(x + arrowHalfWidth, baseY);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        };

        const renderClippingArrows = () => {
            const manualLimitActive = Number.isFinite(state.canvas.customLimits?.yLimit) && state.canvas.customLimits.yLimit > 0;
            if (state.autoScaleY && !manualLimitActive) return;
            if (!clippedFlags.some(Boolean)) return;
            const regions = [];
            let startIdx = null;
            for (let i = 0; i < clippedFlags.length; i++) {
                if (clippedFlags[i]) {
                    if (startIdx === null) startIdx = i;
                } else if (startIdx !== null) {
                    regions.push([startIdx, i - 1]);
                    startIdx = null;
                }
            }
            if (startIdx !== null) regions.push([startIdx, clippedFlags.length - 1]);
            if (!regions.length) return;
            const baseTop = Math.max(lensTop + 4, topBoundaryY);
            const baseBottom = Math.min(lensBottom - 4, bottomBoundaryY);
            const globalSpacing = Math.max(1, Math.floor(profile.z.length / 40));
            const labelEntries = [];
            for (const [start, end] of regions) {
                const regionLength = Math.max(1, end - start + 1);
                const step = Math.max(1, Math.min(globalSpacing, regionLength));
                for (let idx = start; idx <= end; idx += step) {
                    const z = profile.z[idx];
                    if (!Number.isFinite(z)) continue;
                    const x = zToX(z);
                    drawOverflowArrow(x, baseTop, 'up');
                    drawOverflowArrow(x, baseBottom, 'down');
                }
                const midIndex = Math.round((start + end) / 2);
                if (Number.isFinite(profile.z[midIndex])) {
                    labelEntries.push(zToX(profile.z[midIndex]));
                }
            }
            if (labelEntries.length) {
                ctx.save();
                ctx.fillStyle = '#b91c1c';
                ctx.font = '600 11px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                for (const x of labelEntries) {
                    ctx.fillText('beam off-scale', x, baseTop - 4);
                    ctx.textBaseline = 'top';
                    ctx.fillText('beam off-scale', x, baseBottom + 4);
                    ctx.textBaseline = 'bottom';
                }
                ctx.restore();
            }
        };
        ctx.strokeStyle = '#cbd5f5'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(paddingLeft, axisY); ctx.lineTo(width - paddingRight, axisY); ctx.stroke();

        // Draw y-axis ticks/labels reserved to the left of the beam plot
        const tickGap = Math.max(10, Math.min(14, yAxisReserve * 0.45));
        const yAxisTickX = paddingLeft - tickGap;
        const yAxisLabelX = yAxisTickX - 6;
        ctx.save();
        ctx.lineWidth = 1;

        // Unit label
        ctx.fillStyle = '#475569';
        ctx.font = '500 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('µm', yAxisLabelX + 8, lensTop - 4);

        const radiusSpan = maxRadius;
        if (radiusSpan > 0) {
            let wTickStep = computeNiceTickStep(radiusSpan);
            if (!Number.isFinite(wTickStep) || wTickStep <= 0) { wTickStep = radiusSpan / 4; }
            if (!Number.isFinite(wTickStep) || wTickStep <= 0) { wTickStep = 1e-5; }
            const tickLen = 11;
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = '500 11px "Segoe UI", sans-serif';
            const labelPrecision = (() => {
                const stepUm = metersToMicrons(wTickStep);
                if (stepUm >= 500) return 0;
                if (stepUm >= 100) return 1;
                if (stepUm >= 10) return 1;
                if (stepUm >= 1) return 2;
                return 3;
            })();
            for (let tick = 0; tick <= radiusSpan + wTickStep * 0.5; tick += wTickStep) {
                const offset = Math.min(radialHalfSpan, wToYoffsetPx(tick));
                const topY = axisY - offset;
                const bottomY = axisY + offset;
                // Upper tick (including zero)
                ctx.beginPath();
                ctx.moveTo(yAxisTickX, topY);
                ctx.lineTo(yAxisTickX + tickLen, topY);
                ctx.stroke();
                const baseLabel = formatNumber(metersToMicrons(tick), { precision: labelPrecision, unit: '' });
                if (tick === 0) {
                    ctx.fillText(`${baseLabel}`, yAxisLabelX, axisY);
                } else {
                    ctx.fillText(`+${baseLabel}`, yAxisLabelX, topY);
                    // Mirror tick and label below the axis
                    ctx.beginPath();
                    ctx.moveTo(yAxisTickX, bottomY);
                    ctx.lineTo(yAxisTickX + tickLen, bottomY);
                    ctx.stroke();
                    ctx.fillText(`−${baseLabel}`, yAxisLabelX, bottomY);
                }
            }
        }
        ctx.restore();
        const topPoints = [];
        const bottomPoints = [];
        let hasEnvelopeCurves = false;
        const strokeEnvelopeCurves = () => {
            if (!hasEnvelopeCurves || !topPoints.length || !bottomPoints.length) return;
            ctx.strokeStyle = '#225fba';
            ctx.lineWidth = 1.6;

            ctx.beginPath();
            ctx.moveTo(topPoints[0][0], topPoints[0][1]);
            for (let i = 1; i < topPoints.length; i++) {
                const [x, y] = topPoints[i];
                ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(bottomPoints[0][0], bottomPoints[0][1]);
            for (let i = 1; i < bottomPoints.length; i++) {
                const [x, y] = bottomPoints[i];
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        };
        const clippedFlags = new Array(profile.z.length).fill(false);
        for (let i = 0; i < profile.z.length; i++) {
            const z = profile.z[i];
            const w = profile.w[i];
            if (!Number.isFinite(w)) continue;
            const scaledPx = wToYoffsetPx(w);
            const yOffset = Math.min(radialHalfSpan, scaledPx);
            const x = zToX(z);
            topPoints.push([x, axisY - yOffset]);
            bottomPoints.push([x, axisY + yOffset]);
            if ((!state.autoScaleY || manualLimitActive) && scaledPx >= radialHalfSpan - 0.25) {
                clippedFlags[i] = true;
            }
        }
        if (topPoints.length) {
            // Fill the beam envelope without stroking the closed polygon
            ctx.fillStyle = 'rgba(34, 95, 186, 0.18)';
            ctx.beginPath();
            ctx.moveTo(topPoints[0][0], topPoints[0][1]);
            for (const [x, y] of topPoints) ctx.lineTo(x, y);
            for (let i = bottomPoints.length - 1; i >= 0; i--) { const [x, y] = bottomPoints[i]; ctx.lineTo(x, y); }
            ctx.closePath();
            ctx.fill();
            hasEnvelopeCurves = true;
        }

        const interpolateEnvelopeY = (points, x) => {
            if (!points.length) return axisY;
            if (x <= points[0][0]) return points[0][1];
            if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
            let low = 0;
            let high = points.length - 1;
            while (high - low > 1) {
                const mid = Math.floor((low + high) / 2);
                if (points[mid][0] === x) return points[mid][1];
                if (points[mid][0] < x) low = mid;
                else high = mid;
            }
            const [x0, y0] = points[low];
            const [x1, y1] = points[high];
            const span = x1 - x0;
            const t = span !== 0 ? (x - x0) / span : 0;
            return y0 + (y1 - y0) * t;
        };

        const drawWavefrontGuides = () => {
            if (!Array.isArray(profile?.q) || !profile.q.length) return;
            const fallbackWaist = state.target.waist || state.initial.waist || 1e-4;
            const lambda = profile.lambda || state.initial.lambda;
            const clipLimitMeters = radialHalfSpan / pxPerMeterRadial;
            const minSpacingMeters = Math.max(span / 22, 0.02);
            const lensGuideExclusionMeters = Math.max(24 / Math.max(pxPerMeter, 1e-6), span * 0.006);
            const targetSagPx = Math.min(radialHalfSpan * 0.8, 36);
            const maxSagBoost = 8000;
            let lastZ = Number.NEGATIVE_INFINITY;
            let drawn = 0;
            const maxGuides = 90;

            ctx.save();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
            ctx.lineWidth = 0.85;
            ctx.setLineDash([]);

            for (let i = 0; i < profile.q.length && drawn < maxGuides; i++) {
                const z = profile.z[i];
                if (!Number.isFinite(z) || z - lastZ < minSpacingMeters) continue;
                const tooCloseToLens = sortedLenses.some((lens) => Math.abs(lens.position - z) <= lensGuideExclusionMeters);
                if (tooCloseToLens) continue;
                const qSample = profile.q[i];
                if (!qSample) continue;
                const metrics = extractBeamMetrics(qSample, lambda);
                const baseXPx = zToX(z);
                const radius = metrics.R;
                const radiusAbs = Number.isFinite(radius) ? Math.abs(radius) : null;
                let localW = Number.isFinite(metrics.w) && metrics.w > 0 ? metrics.w : fallbackWaist;
                localW = Math.min(localW, clipLimitMeters);
                if (!Number.isFinite(localW) || localW <= 0) continue;
                let sagBoost = 1;
                if (radiusAbs !== null && radiusAbs > 1e-6) {
                    const sagMeters = (localW * localW) / (2 * radiusAbs);
                    const sagPx = Math.abs(sagMeters * pxPerMeter);
                    if (sagPx > 0 && targetSagPx > 0) {
                        if (sagPx < targetSagPx * 0.85) {
                            sagBoost = Math.min(maxSagBoost, targetSagPx / Math.max(sagPx, 1e-6));
                        } else if (sagPx > targetSagPx * 1.5) {
                            sagBoost = Math.max(0.2, (targetSagPx * 0.9) / sagPx);
                        }
                    }
                }
                const samples = 28;
                let started = false;
                ctx.beginPath();
                for (let s = 0; s <= samples; s++) {
                    const frac = -1 + (2 * s / samples);
                    const yMeters = localW * frac;
                    const yCurveMeters = (radiusAbs !== null && radiusAbs > 1e-6)
                        ? Math.sign(yMeters) * Math.min(Math.abs(yMeters), Math.max(radiusAbs - 1e-9, 0))
                        : yMeters;
                    let deltaMeters = 0;
                    if (radiusAbs !== null && radiusAbs > 1e-6) {
                        const centerZ = z - radius;
                        const radicand = Math.max(0, radiusAbs * radiusAbs - yCurveMeters * yCurveMeters);
                        const delta = Math.sqrt(radicand);
                        const physicalX = radius >= 0 ? centerZ + delta : centerZ - delta;
                        deltaMeters = physicalX - z;
                    }
                    const scaledDeltaPx = deltaMeters * pxPerMeter * sagBoost;
                    let xPx = baseXPx + scaledDeltaPx;
                    if (xPx < paddingLeft) xPx = paddingLeft;
                    else if (xPx > width - paddingRight) xPx = width - paddingRight;
                    let yPxOffset = yMeters * pxPerMeterRadial;
                    if (yPxOffset > radialHalfSpan) yPxOffset = radialHalfSpan;
                    else if (yPxOffset < -radialHalfSpan) yPxOffset = -radialHalfSpan;
                    let yPx = axisY + yPxOffset;
                    if (yPx < axisY) {
                        const limit = interpolateEnvelopeY(topPoints, xPx);
                        if (yPx < limit) yPx = limit;
                    } else {
                        const limit = interpolateEnvelopeY(bottomPoints, xPx);
                        if (yPx > limit) yPx = limit;
                    }
                    if (!started) { ctx.moveTo(xPx, yPx); started = true; }
                    else ctx.lineTo(xPx, yPx);
                }
                if (started) {
                    ctx.stroke();
                    drawn += 1;
                    lastZ = z;
                }
            }

            ctx.restore();
        };

    drawWavefrontGuides();
    strokeEnvelopeCurves();
        renderClippingArrows();
        ctx.strokeStyle = '#f97316'; ctx.setLineDash([6, 6]); const targetX = zToX(state.target.waistZ); ctx.beginPath(); ctx.moveTo(targetX, lensTop); ctx.lineTo(targetX, lensBottom); ctx.stroke(); ctx.setLineDash([]);
        const rectHeight = lensBottom - lensTop;
        for (const analyzer of state.components.analyzers) {
            const radius = Math.max(0, analyzer.lensExclusionRadius || 0); if (radius <= 0) continue;
            const startZ = analyzer.position - radius; const endZ = analyzer.position + radius; const xStart = zToX(startZ); const xEnd = zToX(endZ);
            const xMin = Math.max(paddingLeft, Math.min(xStart, xEnd)); const xMax = Math.min(width - paddingRight, Math.max(xStart, xEnd)); if (!(xMax > xMin)) continue;
            ctx.save(); ctx.fillStyle = 'rgba(220, 38, 38, 0.18)'; ctx.strokeStyle = 'rgba(220, 38, 38, 0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(xMin, lensTop, Math.max(1, xMax - xMin), rectHeight); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        for (const lens of sortedLenses) {
            const x = zToX(lens.position); drawLensGraphic(ctx, x, lensTop, lensBottom, lens, state.locked);
            const lensLabel = lens.label || deriveLensLabel('', metersToMillimeters(lens.focalLength), '', lens.type || 'lens');
            
            // Draw focal length below the name
            const focalMm = metersToMillimeters(Math.abs(lens.focalLength));
            const sign = lens.focalLength < 0 ? '−' : '';
            const precision = focalMm >= 100 ? 0 : 1;
            const focalText = `${sign}${formatNumber(focalMm, { precision, trim: true })} mm`;
            
            // Measure text for box sizing
            ctx.font = '500 12px "Segoe UI", sans-serif';
            const nameMetrics = ctx.measureText(lensLabel);
            ctx.font = '400 10px "Segoe UI", sans-serif';
            const focalMetrics = ctx.measureText(focalText);
            
            const boxWidth = Math.max(nameMetrics.width, focalMetrics.width) + 8;
            const boxHeight = 28;
            const boxLeft = x - boxWidth / 2;
            const boxTop = lensTop + 8;
            
            // Draw semi-transparent background box
            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);
            
            // Draw box border
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);
            
            // Draw lens name
            ctx.fillStyle = '#0f172a';
            ctx.font = '500 12px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(lensLabel, x, lensTop + 12);
            
            // Draw focal length
            ctx.font = '400 10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(focalText, x, lensTop + 26);
        }
        for (const analyzer of state.components.analyzers) {
            const x = zToX(analyzer.position);
            // Thin vertical line spanning the interaction region
            ctx.save();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(x, lensTop);
            ctx.lineTo(x, lensBottom);
            ctx.stroke();
            ctx.restore();

            // Triangle marker at the top (pointing down)
            const triH = 12; const triW = 16;
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(x, lensTop + triH);
            ctx.lineTo(x + triW / 2, lensTop);
            ctx.lineTo(x - triW / 2, lensTop);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.stroke();

            // Label just below the triangle
            ctx.fillStyle = '#0f172a';
            ctx.font = '500 12px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(analyzer.label || analyzer.id, x, lensTop + triH + 2);
        }
        const tickStep = computeNiceTickStep(rangeMax - rangeMin);
        if (tickStep > 0) {
            const tickPrecision = determineTickPrecision(tickStep); const tickHeight = 10; const baseY = lensBottom; const labelY = baseY + tickHeight + 4;
            const startTick = Math.floor(rangeMin / tickStep) * tickStep; const endTick = Math.ceil(rangeMax / tickStep) * tickStep;
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)'; ctx.fillStyle = '#475569'; ctx.lineWidth = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '500 11px "Segoe UI", sans-serif';
            for (let tick = startTick; tick <= endTick + tickStep * 0.5; tick += tickStep) {
                const x = zToX(tick); if (x < paddingLeft - 2 || x > width - paddingRight + 2) continue; ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY + tickHeight); ctx.stroke();
                const labelX = Math.min(Math.max(x, paddingLeft + 14), width - paddingRight - 14); const label = formatNumber(tick, { precision: tickPrecision, unit: 'm' }); ctx.fillText(label, labelX, labelY);
            }
        }

        // Draw output mode info in top-right corner
        const outputMetrics = findOutputWaist(sortedLenses, profile);

        if (Number.isFinite(outputMetrics.w0) && Number.isFinite(outputMetrics.waistZ0)) {
            ctx.save();
            ctx.fillStyle = '#225fba';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            
            // Draw output text with subscripted f
            const wValue = formatNumber(metersToMicrons(outputMetrics.w0), { precision: 2, unit: '\u00b5m' });
            const zValue = formatNumber(outputMetrics.waistZ0, { precision: 3, unit: 'm' });
            
            ctx.font = '600 14px "Segoe UI", sans-serif';
            const baseY = 8;
            let x = width - paddingRight - 8;
            
            // Draw from right to left (since textAlign is 'right')
            const zText = ` = ${zValue}`;
            ctx.fillText(zText, x, baseY);
            x -= ctx.measureText(zText).width;
            
            // Draw subscript f
            ctx.font = '600 10px "Segoe UI", sans-serif';
            ctx.fillText('f', x, baseY + 5);
            x -= ctx.measureText('f').width;
            
            // Draw z
            ctx.font = '600 14px "Segoe UI", sans-serif';
            ctx.fillText('z', x, baseY);
            x -= ctx.measureText('z').width;
            
            // Draw middle part
            const middleText = `, `;
            ctx.fillText(middleText, x, baseY);
            x -= ctx.measureText(middleText).width;
            
            // Draw w value
            const wValueText = ` = ${wValue}`;
            ctx.fillText(wValueText, x, baseY);
            x -= ctx.measureText(wValueText).width;
            
            // Draw subscript f
            ctx.font = '600 10px "Segoe UI", sans-serif';
            ctx.fillText('f', x, baseY + 5);
            x -= ctx.measureText('f').width;
            
            // Draw w
            ctx.font = '600 14px "Segoe UI", sans-serif';
            ctx.fillText('w', x, baseY);
            x -= ctx.measureText('w').width;
            
            // Draw "Output: "
            ctx.fillText('Output: ', x, baseY);
            
            ctx.restore();
        }

        state.canvas.scale = { rangeMin: effectiveRangeMin, rangeMax: effectiveRangeMax, pxPerMeter, paddingLeft, paddingRight, width, height };
    }
    function computeModeMatching(w1, R1, w2, R2, lambda) {
        return optics.computeModeOverlap(w1, R1, w2, R2, lambda);
    }
    function evaluateArrangement(lensSet) {
        if (!Array.isArray(lensSet) || lensSet.length === 0) return null;
        const sorted = [...lensSet].sort((a, b) => a.position - b.position);
        const normalized = optics.normalizeSystem({
            initial: { ...state.initial },
            target: { ...state.target },
            components: {
                lenses: sorted.map((lens) => ({ ...lens })),
                analyzers: []
            }
        });
        const trace = optics.traceSystem(normalized, {
            sampleRange: computeProfileRange(sorted),
            sampleCount: 160,
            anchorPositions: [state.target.waistZ]
        });
        const scored = optics.scoreSolution(trace, normalized.target);
        if (!scored) return null;
        return {
            id: null,
            lenses: sorted.map((lens) => ({ label: lens.label, focalLength: lens.focalLength, position: lens.position, sourceId: lens.sourceId || null, type: lens.type || 'lens' })),
            metrics: { ...scored.metrics },
            modeMatching: scored.modeMatching,
            score: scored.score
        };
    }
    function renderSolutionsList(solutions) {
        if (!Array.isArray(solutions) || !solutions.length) { dom.solutionsList.className = 'mm-empty-state'; dom.solutionsList.innerHTML = 'Run the solver to populate candidate optical trains.'; updateSolutionsVisibility(); return; }
        dom.solutionsList.className = 'mm-results-list';
        const items = solutions.map((solution, idx) => {
            const selected = solution.id === state.selectedSolutionId; const modeMatch = clamp(typeof solution.modeMatching === 'number' ? solution.modeMatching : 0, 0, 1); const modeMatchPct = modeMatch * 100;
            const lensCount = Number.isInteger(solution.lensCount) ? solution.lensCount : (Array.isArray(solution.lenses) ? solution.lenses.length : 0);
            const lensCountLabel = lensCount === 1 ? '1 lens' : `${lensCount} lenses`;
            const lensChips = solution.lenses.map((lens) => `<span class="mm-chip">${lens.label || 'Lens'} · ${formatNumber(metersToMillimeters(Math.abs(lens.focalLength)), { precision: 1, unit: 'mm' })} @ ${formatNumber(lens.position, { precision: 3, unit: 'm' })}</span>`).join('');
            const applyLabel = selected ? 'Applied' : 'Apply Solution';
            const applyTitle = selected ? 'This solution is already applied' : 'Apply this solution to the layout';
            return `<div class="mm-result-card${selected ? ' mm-selected' : ''}" data-solution-id="${solution.id}"><header><span>Solution #${idx + 1}</span><span class="mm-chip">${lensCountLabel}</span><span class="mm-chip">Mode match ${formatNumber(modeMatchPct, { precision: 1, unit: '%' })}</span></header><div class="mm-result-metrics"><span>Waist: ${formatNumber(metersToMicrons(solution.metrics.w0), { precision: 2, unit: 'µm' })}</span><span>z<sub>0</sub>: ${formatNumber(solution.metrics.waistZ0, { precision: 3, unit: 'm' })}</span><span>Δw: ${formatNumber(metersToMicrons(solution.metrics.errorW), { precision: 2, unit: 'µm' })}</span><span>Δz: ${formatNumber(solution.metrics.errorZ, { precision: 2, unit: 'mm', scale: 1e3 })}</span><span>Score: ${formatNumber(solution.score, { precision: 2, unit: '' })}</span></div><div class="mm-result-metrics">${lensChips}</div><div class="mm-toolbar" style="justify-content: space-between; gap: 8px;"><button type="button" data-action="dismiss-solution" class="mm-button-ghost" title="Remove this solution from the list">Dismiss</button><button type="button" data-action="apply-solution" class="${selected ? '' : 'mm-button-ghost'}" title="${applyTitle}">${applyLabel}</button></div></div>`;
        }).join('');
        dom.solutionsList.innerHTML = items; updateSolutionsVisibility();
    }
    function updateSolutionsVisibility() {
        if (!dom.solutionsList) return; const collapsed = !!state.solutionsCollapsed;
        dom.solutionsList.style.display = collapsed ? 'none' : ''; dom.solutionsList.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
        if (dom.toggleSolutionsList) { dom.toggleSolutionsList.textContent = collapsed ? 'Expand Solutions' : 'Collapse Solutions'; dom.toggleSolutionsList.setAttribute('aria-expanded', collapsed ? 'false' : 'true'); }
    }
    function setSolutionsCollapsed(collapsed) { state.solutionsCollapsed = !!collapsed; updateSolutionsVisibility(); }
    function invalidateSolutions(message, forceMessage = false) { const hadResults = forceMessage || state.solutions.length > 0 || state.selectedSolutionId !== null; state.solutions = []; state.selectedSolutionId = null; renderSolutionsList(state.solutions); if (message && hadResults) setSolverStatus(message, 'busy'); }
    function updateAutoYToggle() {
        if (!dom.toggleAutoY) return;
        if (state.autoScaleY) {
            dom.toggleAutoY.textContent = 'Autoscale Y: On';
            dom.toggleAutoY.classList.add('mm-button-ghost');
            dom.toggleAutoY.title = 'Disable to keep vertical scale fixed';
            state.canvas.lockedMaxRadius = null;
        } else {
            dom.toggleAutoY.textContent = 'Autoscale Y: Off';
            dom.toggleAutoY.classList.remove('mm-button-ghost');
            dom.toggleAutoY.title = 'Enable automatic vertical scaling';
            const anchor = state.canvas.lastMaxRadius || state.canvas.lockedMaxRadius || state.target.waist || 1e-4;
            state.canvas.lockedMaxRadius = Math.max(anchor, 1e-6);
        }
    }
    function generateGridPositions(zMin, zMax, steps) {
        if (!Number.isFinite(zMin) || !Number.isFinite(zMax)) return []; if (steps <= 1) return [(zMin + zMax) / 2];
        const positions = []; const span = zMax - zMin; const denom = steps - 1; for (let i = 0; i < steps; i++) { positions.push(zMin + span * (i / denom)); } return positions;
    }
    function computeNiceTickStep(span) { if (!Number.isFinite(span) || span <= 0) return 0; const targetTicks = 6; const rawStep = span / targetTicks; const exponent = Math.floor(Math.log10(rawStep)); const base = Math.pow(10, exponent); const multipliers = [1, 2, 5, 10]; for (const m of multipliers) { const candidate = m * base; if (rawStep <= candidate) return Math.max(candidate, 1e-4); } return 10 * base; }
    function determineTickPrecision(step) { if (!Number.isFinite(step) || step <= 0) return 3; if (step >= 1) return 1; if (step >= 0.1) return 2; if (step >= 0.01) return 3; return 4; }
    function permutationsCount(n, k) { let product = 1; for (let i = 0; i < k; i++) product *= (n - i); return product; }
    function combinationsCount(n, k) { if (k > n) return 0; k = Math.min(k, n - k); let numerator = 1; let denominator = 1; for (let i = 1; i <= k; i++) { numerator *= n - (k - i); denominator *= i; } return numerator / denominator; }
    function applyQueryInitialBeamDefaults() {
        const search = window.location.search || '';
        if (!search || search.length <= 1) return;
        const params = new URLSearchParams(search);
        const readNumber = (...keys) => {
            for (const key of keys) {
                if (!params.has(key)) continue;
                const value = parseFloat(params.get(key));
                if (Number.isFinite(value)) return value;
            }
            return null;
        };
        let updated = false;
        const waistMicrons = readNumber('w0', 'waist', 'wo');
        if (Number.isFinite(waistMicrons) && waistMicrons > 0 && dom.initialWaist) {
            dom.initialWaist.value = waistMicrons.toString();
            state.initial.waist = micronsToMeters(waistMicrons);
            updated = true;
        }
        const waistZ = readNumber('z0', 'waistz');
        if (Number.isFinite(waistZ) && dom.initialWaistZ) {
            dom.initialWaistZ.value = waistZ.toString();
            state.initial.waistZ = waistZ;
            updated = true;
        }
        const lambdaNm = readNumber('lambda', 'wl', 'lam');
        if (Number.isFinite(lambdaNm) && lambdaNm > 0 && dom.initialLambda) {
            dom.initialLambda.value = lambdaNm.toString();
            state.initial.lambda = nanometersToMeters(lambdaNm);
            updated = true;
        }
        const ref = readNumber('ref', 'reference', 'zref');
        if (Number.isFinite(ref) && dom.referencePlane) {
            dom.referencePlane.value = ref.toString();
            state.initial.reference = ref;
            updated = true;
        }
        if (updated) {
            setSolverStatus('Initial beam prefilled from URL parameters', 'success');
        }
    }
    function loadConfigurationFromQuery() {
        const search = window.location.search || '';
        if (!search || search.length <= 1) return;
        const params = new URLSearchParams(search);
        if (!params.has('share')) return;
        const sharePayload = tryParseConfigPayload(params.get('share'));
        if (!sharePayload) {
            setSolverStatus('Invalid shared configuration link', 'busy');
            return;
        }
        try {
            applyConfigurationPayload(sharePayload);
            setSolverStatus('Shared configuration loaded', 'success');
        } catch (error) {
            console.error('Failed to apply shared configuration', error);
            setSolverStatus('Failed to load shared configuration', 'busy');
        }
    }
    async function runSolverSearch() {
        const { lensCount: maxLensCount, allowDuplicates, gridSteps, zMin, zMax, minModeMatch, minLensSpacing, clearBeforeSearch } = state.solver;
        if (!state.library.length) { setSolverStatus('Add lenses to the library before solving', 'busy'); return [];} if (maxLensCount <= 0) { setSolverStatus('Lens count must be at least 1', 'busy'); return []; }
        const baselineLenses = clearBeforeSearch ? [] : state.components.lenses.map((lens) => ({ label: lens.label, focalLength: lens.focalLength, position: lens.position, sourceId: lens.sourceId || lens.id || null }));
        const baselinePositions = baselineLenses.map((lens) => lens.position).filter((pos) => Number.isFinite(pos));
        let preservedLenses = null;
        if (clearBeforeSearch && state.components.lenses.length) {
            preservedLenses = [...state.components.lenses];
            state.components.lenses = [];
        }
        const rawGridPositions = generateGridPositions(zMin, zMax, gridSteps);
        const exclusionZones = state.components.analyzers.filter((an) => Number.isFinite(an.position) && Math.max(0, an.lensExclusionRadius || 0) > 0).map((an) => ({ position: an.position, radius: Math.max(0, an.lensExclusionRadius || 0) }));
        const gridPositions = rawGridPositions.filter((pos) => exclusionZones.every((zone) => Math.abs(pos - zone.position) > zone.radius - 1e-9));
        const minSpacingMeters = Math.max(0, Number(minLensSpacing) || 0);
        const librarySize = state.library.length; const validCounts = []; let estimatedTotal = 0;
        for (let count = 1; count <= maxLensCount; count++) { const sequenceCount = allowDuplicates ? Math.pow(librarySize, count) : permutationsCount(librarySize, count); if (sequenceCount === 0) continue; const positionCount = combinationsCount(gridPositions.length, count); if (positionCount === 0) continue; const combos = sequenceCount * positionCount; validCounts.push({ count, combos }); estimatedTotal += combos; }
        if (!validCounts.length) {
            if (gridPositions.length < 1) { const blockedCount = rawGridPositions.length - gridPositions.length; setSolverStatus(blockedCount > 0 ? 'No usable positions remain after applying exclusions; relax the blocked zones or widen the search range' : 'Increase grid steps or range; insufficient positions for lenses', 'busy'); }
            else { setSolverStatus('Library or grid does not support the requested lens counts', 'busy'); }
            return [];
        }
        if (estimatedTotal > 5000000) {
            const approx = Math.round(estimatedTotal).toLocaleString();
            setSolverStatus(`Search space exceeds 5,000,000 combos (~${approx}). Reduce max lens count, grid steps, or range.`, 'busy');
            return [];
        }

        const warnLargeSearch = estimatedTotal > 2500000;
        const approxTotal = Math.round(estimatedTotal).toLocaleString();
        const initialStatus = warnLargeSearch
            ? `Large search (~${approxTotal} combos). This may take a little while…`
            : 'Searching...';

        setSolverStatus(initialStatus, 'busy'); dom.runSolverBtn.disabled = true; state.solutions = []; state.selectedSolutionId = null; renderSolutionsList(state.solutions);
        let processed = 0;
        const updateInterval = Math.max(25, Math.floor(estimatedTotal / 120));

        const updateProgressStatus = () => {
            if (!estimatedTotal) {
                setSolverStatus('Evaluating…', 'busy');
                return;
            }
            const percent = Math.min(100, (processed / estimatedTotal) * 100);
            const formattedPercent = percent >= 99.95 ? '100' : percent.toFixed(percent >= 10 ? 1 : 2);
            const displayProcessed = Math.round(processed).toLocaleString();
            const displayTotal = Math.round(estimatedTotal).toLocaleString();
            setSolverStatus(`Evaluating ${displayProcessed} / ${displayTotal} combos (${formattedPercent}%)`, 'busy');
        };
        for (const { count: lensCount } of validCounts) {
            const seqIndices = new Array(lensCount); const used = new Set();
            async function assignPositions(depth, startIdx, currentPositions) {
                if (depth === lensCount) {
                    processed += 1;
                    if (processed % updateInterval === 0 || processed === estimatedTotal) {
                        updateProgressStatus();
                        await new Promise((resolve) => requestAnimationFrame(resolve));
                    }
                    const arrangement = seqIndices.slice(0, lensCount).map((libIndex, idx) => ({ label: state.library[libIndex].label, focalLength: millimetersToMeters(state.library[libIndex].focalLengthMm), position: currentPositions[idx], sourceId: state.library[libIndex].id }));
                    const combinedLensSet = baselineLenses.length ? baselineLenses.map((lens) => ({ ...lens })) : [];
                    combinedLensSet.push(...arrangement);
                    const evaluation = evaluateArrangement(combinedLensSet);
                    if (evaluation && evaluation.modeMatching >= minModeMatch) {
                        evaluation.id = nextId('Solution');
                        evaluation.lensCount = combinedLensSet.length;
                        evaluation.addedLensCount = lensCount;
                        evaluation.baselineLensCount = baselineLenses.length;
                        state.solutions.push(evaluation);
                    }
                    return;
                }
                for (let i = startIdx; i < gridPositions.length; i++) {
                    const position = gridPositions[i];
                    if (minSpacingMeters > 0) {
                        if (currentPositions.length > 0) {
                            const lastPosition = currentPositions[currentPositions.length - 1];
                            if (position - lastPosition < minSpacingMeters - 1e-9) continue;
                        }
                        let blockedByBaseline = false;
                        for (const basePos of baselinePositions) {
                            if (!Number.isFinite(basePos)) continue;
                            if (Math.abs(position - basePos) < minSpacingMeters - 1e-9) {
                                blockedByBaseline = true;
                                break;
                            }
                        }
                        if (blockedByBaseline) continue;
                    }
                    await assignPositions(depth + 1, i + 1, [...currentPositions, position]);
                }
            }
            async function assignLens(depth) {
                if (depth === lensCount) { await assignPositions(0, 0, []); return; }
                for (let i = 0; i < librarySize; i++) { if (!allowDuplicates && used.has(i)) continue; seqIndices[depth] = i; if (!allowDuplicates) used.add(i); await assignLens(depth + 1); if (!allowDuplicates) used.delete(i); }
            }
            await assignLens(0);
        }
        state.solutions.sort((a, b) => { if (Math.abs(b.modeMatching - a.modeMatching) > 1e-9) { return b.modeMatching - a.modeMatching; } if ((a.lensCount || 0) !== (b.lensCount || 0)) { return (a.lensCount || 0) - (b.lensCount || 0); } return a.score - b.score; });
        state.solutions = state.solutions.slice(0, 25); setSolutionsCollapsed(false); renderSolutionsList(state.solutions);
        if (preservedLenses) {
            state.components.lenses = preservedLenses;
            refreshAll();
        }
        const statusText = state.solutions.length ? `${state.solutions.length} solution${state.solutions.length === 1 ? '' : 's'} found` : 'No solutions met the mode-matching threshold';
        setSolverStatus(statusText, state.solutions.length ? 'success' : 'busy'); dom.runSolverBtn.disabled = false; return state.solutions;
    }
    function applySolution(solutionId) {
        if (!solutionId) return; const solution = state.solutions.find((item) => item.id === solutionId); if (!solution) return;
        state.components.lenses = solution.lenses.map((lens) => ({ id: nextId('L'), focalLength: lens.focalLength, position: lens.position, label: deriveLensLabel(lens.label, metersToMillimeters(lens.focalLength), lens.label, lens.type || 'lens'), sourceId: lens.sourceId || null }));
        state.selectedSolutionId = solutionId; resetLensForm(); refreshAll(); setSolverStatus(`Applied ${solution.lenses.length}-lens solution`, 'success');
    }
    function buildSharePayload(solution, options = {}) {
        const includeSolutionsList = options.includeSolutionsList !== false;
        const payloadSolution = solution ? cloneSolution(solution) : null;
        const componentsSnapshot = cloneComponents(state.components);
        if (payloadSolution) {
            componentsSnapshot.lenses = payloadSolution.lenses.map((lens) => ({ ...lens }));
        }
        const payload = {
            version: APP_VERSION,
            timestamp: new Date().toISOString(),
            initial: { ...state.initial },
            target: { ...state.target },
            components: componentsSnapshot,
            solver: { ...state.solver },
            library: cloneLibraryEntries(state.library),
        };
        if (includeSolutionsList) {
            payload.solutions = payloadSolution ? [payloadSolution] : state.solutions.map((item) => cloneSolution(item)).filter(Boolean);
            payload.selectedSolutionId = payloadSolution ? payloadSolution.id : state.selectedSolutionId;
        };
        return payload;
    }
    function buildShareUrl(solution, options) {
        const payload = buildSharePayload(solution, options);
        const encoded = encodeURIComponent(base64EncodeUnicode(JSON.stringify(payload)));
        return `${SHARE_BASE_URL}?share=${encoded}`;
    }
    async function copySettingsLink() {
        try {
            const url = buildShareUrl(null, { includeSolutionsList: false });
            await copyToClipboard(url);
            setSolverStatus('Shareable configuration link copied', 'success');
        } catch (error) {
            console.error('Failed to copy configuration link', error);
            setSolverStatus('Unable to copy share link', 'busy');
        }
    }
    function pointerToZ(clientX) {
        if (!state.canvas.scale) return state.initial.reference; const rect = dom.beamCanvas.getBoundingClientRect(); const { rangeMin, pxPerMeter, paddingLeft, paddingRight, width } = state.canvas.scale; if (!(pxPerMeter > 0)) return rangeMin; const x = clamp(clientX - rect.left, 0, width); const clampedX = clamp(x, paddingLeft, width - paddingRight); return rangeMin + (clampedX - paddingLeft) / pxPerMeter;
    }
    function findComponentNear(z) {
        if (!state.canvas.scale) return null; const tolerance = 16; const { pxPerMeter } = state.canvas.scale; const threshold = tolerance / pxPerMeter; let closest = null; let minDist = Infinity;
        for (const lens of state.components.lenses) { const d = Math.abs(lens.position - z); if (d < minDist && d <= threshold) { closest = { type: 'lens', id: lens.id, position: lens.position }; minDist = d; } }
        for (const analyzer of state.components.analyzers) { const d = Math.abs(analyzer.position - z); if (d < minDist && d <= threshold) { closest = { type: 'analyzer', id: analyzer.id, position: analyzer.position }; minDist = d; } }
        return closest;
    }
    function updateCanvasCursor(z) { if (state.locked) { dom.beamCanvas.style.cursor = 'not-allowed'; return; } const hit = findComponentNear(z); dom.beamCanvas.style.cursor = hit ? 'grab' : 'crosshair'; }
    function showDragIndicator(content) { if (!dom.dragIndicator) return; dom.dragIndicator.textContent = content; dom.dragIndicator.classList.add('mm-visible'); }
    function hideDragIndicator() { if (!dom.dragIndicator) return; dom.dragIndicator.classList.remove('mm-visible'); }
    function refreshAll() {
        const sortedLenses = getSortedLenses(); renderLensTable(); const profile = computeBeamProfile(sortedLenses); state.lastTrace = profile; updateChart(profile); drawCanvas(profile, sortedLenses); renderAnalyzerTable(sortedLenses, profile); renderSolutionsList(state.solutions);
        if (!state.locked) { const probeZ = Number.isFinite(state.canvas.pointerZ) ? state.canvas.pointerZ : state.initial.reference; updateCanvasCursor(probeZ); } else { dom.beamCanvas.style.cursor = 'not-allowed'; }
    }
    function addLens({ focalMm, position, label, type = 'lens', roc = null }) {
        const focalLength = millimetersToMeters(focalMm); if (!Number.isFinite(focalLength) || Math.abs(focalLength) < 1e-6) return;
        const lens = { 
            id: nextId(type === 'mirror' ? 'M' : 'L'), 
            focalLength, 
            position, 
            label: deriveLensLabel(label, focalMm, '', type),
            type: type || 'lens',
            roc: roc ? millimetersToMeters(roc) : null
        };
        state.components.lenses.push(lens); invalidateSolutions('Layout changed - rerun solver'); refreshAll();
    }
    function addAnalyzer({ label, position, exclusionRadius = 0 }) {
        if (!Number.isFinite(position)) return; const analyzer = { id: nextId('A'), label: label || '', position, lensExclusionRadius: Math.max(0, exclusionRadius) };
        state.components.analyzers.push(analyzer); invalidateSolutions('Layout changed - rerun solver'); refreshAll();
    }
    function syncLensSubmitButton() {
        const lensType = dom.lensTypeInput?.value === 'mirror' ? 'mirror' : 'lens';
        const action = state.editingLensId ? 'Save' : 'Add';
        const noun = lensType === 'mirror' ? 'Mirror' : 'Lens';
        dom.addLensBtn.textContent = `${action} ${noun}`;
        dom.addLensBtn.title = `${action} ${noun.toLowerCase()} using the values above`;
    }
    function resetLensForm(preserveValues = false) { state.editingLensId = null; syncLensSubmitButton(); dom.cancelLensEditBtn.style.display = 'none'; if (!preserveValues) { dom.lensLabelInput.value = ''; } }
    function startLensEdit(lens) {
        if (!lens) return; state.editingLensId = lens.id; dom.lensLabelInput.value = lens.label || '';
        const lensType = lens.type || 'lens';
        dom.lensTypeInput.value = lensType;
        updateLensTypeUI(lensType);
        if (lensType === 'mirror' && lens.roc) {
            const rocMm = metersToMillimeters(lens.roc);
            dom.lensRocInput.value = Number.isFinite(rocMm) ? parseFloat(rocMm.toFixed(4)).toString() : '';
        } else {
            const focalMm = metersToMillimeters(lens.focalLength);
            dom.lensFocalInput.value = Number.isFinite(focalMm) ? parseFloat(focalMm.toFixed(4)).toString() : '';
        }
        dom.lensPositionInput.value = Number.isFinite(lens.position) ? parseFloat(lens.position.toFixed(4)).toString() : '';
        syncLensSubmitButton(); dom.cancelLensEditBtn.style.display = ''; renderLensTable(); dom.lensLabelInput.focus();
    }
    function handleLensSubmit() {
        const label = dom.lensLabelInput.value;
        const position = readNumericInput(dom.lensPositionInput, 0.2);
        const lensType = dom.lensTypeInput.value;
        let focal, roc;
        if (lensType === 'mirror') {
            roc = readNumericInput(dom.lensRocInput, 200);
            focal = roc / 2; // f = R/2 for curved mirrors
        } else {
            focal = readNumericInput(dom.lensFocalInput, 100);
            roc = null;
        }
        if (!Number.isFinite(focal) || Math.abs(focal) < 1e-6) return; if (!Number.isFinite(position)) return;
        if (state.editingLensId) {
            const lens = state.components.lenses.find((l) => l.id === state.editingLensId); if (!lens) { resetLensForm(); return; }
            const focalLength = millimetersToMeters(focal); 
            lens.focalLength = focalLength; 
            lens.position = position; 
            lens.label = deriveLensLabel(label, focal, '', lensType);
            lens.type = lensType;
            lens.roc = roc ? millimetersToMeters(roc) : null;
            resetLensForm(); invalidateSolutions('Lens updated - rerun solver', true); refreshAll();
        } else { addLens({ focalMm: focal, position, label, type: lensType, roc: roc }); resetLensForm(); }
    }
    function resetLibrary(options = {}) {
        const { skipInvalidate = false, skipRender = false } = options; state.library = buildBuiltinLibrary(); state.librarySequence = computeLibrarySequence(state.library);
        if (!skipRender) renderLibraryTable(); if (!skipInvalidate) invalidateSolutions('Library changed - rerun solver');
    }
    function readNumericInput(input, fallback = 0) { if (!input) return fallback; const val = parseFloat(input.value); return Number.isFinite(val) ? val : fallback; }
    function readNullableInput(input) {
        if (!input) return null;
        const raw = typeof input.value === 'string' ? input.value.trim() : '';
        if (raw === '') return null;
        const value = parseFloat(raw);
        return Number.isFinite(value) ? value : null;
    }
    function applyCanvasLimitInputs() {
        if (!state.canvas.customLimits) { state.canvas.customLimits = { xMin: null, xMax: null, yLimit: null }; }
        const xMin = readNullableInput(dom.canvasLimitXMin);
        const xMax = readNullableInput(dom.canvasLimitXMax);
        const yLimitMicrons = readNullableInput(dom.canvasLimitY);
        state.canvas.customLimits.xMin = Number.isFinite(xMin) ? xMin : null;
        state.canvas.customLimits.xMax = Number.isFinite(xMax) ? xMax : null;
        if (Number.isFinite(yLimitMicrons) && yLimitMicrons > 0) {
            state.canvas.customLimits.yLimit = micronsToMeters(yLimitMicrons);
            if (state.autoScaleY !== false) {
                state.autoScaleY = false;
            }
            updateAutoYToggle();
        } else {
            state.canvas.customLimits.yLimit = null;
        }
        refreshAll();
    }
    function setupInputListeners() {
        const handlers = [
            { el: dom.initialWaist, fn: () => { state.initial.waist = micronsToMeters(readNumericInput(dom.initialWaist, 370)); }, message: 'Beam parameters changed - rerun solver' },
            { el: dom.initialWaistZ, fn: () => { state.initial.waistZ = readNumericInput(dom.initialWaistZ, 0); }, message: 'Beam parameters changed - rerun solver' },
            { el: dom.initialLambda, fn: () => { state.initial.lambda = nanometersToMeters(readNumericInput(dom.initialLambda, 1064)); }, message: 'Beam parameters changed - rerun solver' },
            { el: dom.referencePlane, fn: () => { state.initial.reference = readNumericInput(dom.referencePlane, 0); }, message: 'Beam parameters changed - rerun solver' },
            { el: dom.targetWaist, fn: () => { state.target.waist = micronsToMeters(readNumericInput(dom.targetWaist, 40)); }, message: 'Target updated - rerun solver' },
            { el: dom.targetWaistZ, fn: () => { state.target.waistZ = readNumericInput(dom.targetWaistZ, 0.8); }, message: 'Target updated - rerun solver' },
            { el: dom.targetWaistTolerance, fn: () => { state.target.waistTolerance = micronsToMeters(readNumericInput(dom.targetWaistTolerance, 2)); }, message: 'Target tolerances changed - rerun solver' },
            { el: dom.targetPositionTolerance, fn: () => { state.target.positionTolerance = millimetersToMeters(readNumericInput(dom.targetPositionTolerance, 5)); }, message: 'Target tolerances changed - rerun solver' }
        ];
        for (const { el, fn, message } of handlers) { el.addEventListener('input', () => { fn(); invalidateSolutions(message); refreshAll(); }); }
        const solverHandlers = [
            { el: dom.solverLensCount, fn: () => { state.solver.lensCount = clamp(parseInt(dom.solverLensCount.value, 10) || 1, 1, 4); } },
            { el: dom.solverZMin, fn: () => { state.solver.zMin = readNumericInput(dom.solverZMin, 0); } },
            { el: dom.solverZMax, fn: () => { state.solver.zMax = readNumericInput(dom.solverZMax, 1); } },
            { el: dom.solverGridSteps, fn: () => { state.solver.gridSteps = clamp(parseInt(dom.solverGridSteps.value, 10) || 10, 3, 120); } },
            { el: dom.solverModeMatch, fn: () => { state.solver.minModeMatch = clamp(parseFloat(dom.solverModeMatch.value) / 100, 0, 1); } },
            { el: dom.solverAllowDuplicates, fn: () => { state.solver.allowDuplicates = dom.solverAllowDuplicates.value === 'true'; } },
            { el: dom.solverClearBeforeSearch, fn: () => { state.solver.clearBeforeSearch = dom.solverClearBeforeSearch.value === 'true'; } },
            { el: dom.solverLensSpacing, fn: () => { const spacingCm = Math.max(0, readNumericInput(dom.solverLensSpacing, 2)); state.solver.minLensSpacing = centimetersToMeters(spacingCm); } }
        ];
        for (const { el, fn } of solverHandlers) { el.addEventListener('input', () => { fn(); invalidateSolutions('Solver settings changed - rerun solver'); }); }
    }
    function updateLensTypeUI(type) {
        if (type === 'mirror') {
            dom.lensFocalLabel.style.display = 'none';
            dom.lensRocLabel.style.display = '';
        } else {
            dom.lensFocalLabel.style.display = '';
            dom.lensRocLabel.style.display = 'none';
        }
        syncLensSubmitButton();
    }
    if (dom.lensTypeInput) {
        dom.lensTypeInput.addEventListener('change', () => {
            updateLensTypeUI(dom.lensTypeInput.value);
        });
    }
    dom.runSolverBtn.addEventListener('click', async () => { try { await runSolverSearch(); } catch (error) { console.error('Solver failed', error); setSolverStatus('Solver failed - check console output', 'busy'); dom.runSolverBtn.disabled = false; } });
    dom.addLensBtn.addEventListener('click', () => { handleLensSubmit(); });
    // Add Enter key handler for lens inputs
    [dom.lensLabelInput, dom.lensFocalInput, dom.lensRocInput, dom.lensPositionInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLensSubmit();
                }
            });
        }
    });
    dom.cancelLensEditBtn.addEventListener('click', () => { resetLensForm(); renderLensTable(); });
    dom.clearLensesBtn.addEventListener('click', () => { state.components.lenses = []; resetLensForm(); invalidateSolutions('Layout changed - rerun solver'); refreshAll(); });
    dom.lensTable.addEventListener('click', (event) => {
        const target = event.target; if (!(target instanceof HTMLElement)) return; const row = target.closest('tr'); if (!row) return;
        if (target.dataset.action === 'remove-lens') { state.components.lenses = state.components.lenses.filter((lens) => lens.id !== row.dataset.id); if (state.editingLensId === row.dataset.id) { resetLensForm(); } invalidateSolutions('Layout changed - rerun solver'); refreshAll(); }
        else if (target.dataset.action === 'edit-lens') { const lens = state.components.lenses.find((l) => l.id === row.dataset.id); if (lens) { startLensEdit(lens); } }
    });
    dom.addAnalyzerBtn.addEventListener('click', () => { const position = readNumericInput(dom.analyzerPositionInput, 0.5); const label = dom.analyzerLabelInput.value.trim(); const exclusionRadius = centimetersToMeters(Math.max(0, readNumericInput(dom.analyzerExclusionInput, 0))); addAnalyzer({ position, label, exclusionRadius }); });
    // Add Enter key handler for analyzer inputs
    [dom.analyzerLabelInput, dom.analyzerPositionInput, dom.analyzerExclusionInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const position = readNumericInput(dom.analyzerPositionInput, 0.5);
                    const label = dom.analyzerLabelInput.value.trim();
                    const exclusionRadius = centimetersToMeters(Math.max(0, readNumericInput(dom.analyzerExclusionInput, 0)));
                    addAnalyzer({ position, label, exclusionRadius });
                }
            });
        }
    });
    dom.clearAnalyzersBtn.addEventListener('click', () => { state.components.analyzers = []; invalidateSolutions('Layout changed - rerun solver'); refreshAll(); });
    dom.analyzerTable.addEventListener('click', (event) => { const target = event.target; if (!(target instanceof HTMLElement)) return; if (target.dataset.action === 'remove-analyzer') { const row = target.closest('tr'); if (!row) return; state.components.analyzers = state.components.analyzers.filter((a) => a.id !== row.dataset.id); invalidateSolutions('Layout changed - rerun solver'); refreshAll(); } });
    if (dom.toggleLimitsPanel && dom.customLimitsPanel) {
        const setPanelState = (open) => {
            dom.customLimitsPanel.hidden = !open;
            dom.toggleLimitsPanel.setAttribute('aria-expanded', open ? 'true' : 'false');
            const labelSpan = dom.toggleLimitsPanel.querySelector('.toggle-label');
            const chevron = dom.toggleLimitsPanel.querySelector('.chevron');
            if (labelSpan) labelSpan.textContent = open ? 'Hide Plot Limits' : 'Plot Limits';
            if (chevron) chevron.classList.toggle('mm-open', open);
        };
        dom.toggleLimitsPanel.addEventListener('click', () => {
            const isOpen = dom.toggleLimitsPanel.getAttribute('aria-expanded') === 'true';
            setPanelState(!isOpen);
        });
        setPanelState(false);
    }
    [dom.canvasLimitXMin, dom.canvasLimitXMax, dom.canvasLimitY].forEach((input) => {
        if (!input) return;
        input.addEventListener('change', () => applyCanvasLimitInputs());
        input.addEventListener('blur', () => applyCanvasLimitInputs());
    });
    if (dom.addLibraryLensBtn) {
        dom.addLibraryLensBtn.addEventListener('click', () => {
            if (!dom.libraryLensFocal) return; const inputLabel = dom.libraryLensLabel ? dom.libraryLensLabel.value.trim() : ''; const focal = readNumericInput(dom.libraryLensFocal, 100);
            if (!Number.isFinite(focal) || Math.abs(focal) < 1e-3) return; const label = assignLibraryLabel(inputLabel);
            const entry = { id: nextId('Catalog'), label, focalLengthMm: focal }; state.library.push(entry); renderLibraryTable(); invalidateSolutions('Library changed - rerun solver');
            if (dom.libraryLensLabel) { dom.libraryLensLabel.value = ''; dom.libraryLensLabel.focus(); } });
    }
    if (dom.clearLibraryBtn) { dom.clearLibraryBtn.addEventListener('click', () => { state.library = []; state.librarySequence = 1; renderLibraryTable(); invalidateSolutions('Library changed - rerun solver'); if (dom.libraryLensLabel) { dom.libraryLensLabel.value = ''; dom.libraryLensLabel.focus(); } if (dom.libraryLensFocal) dom.libraryLensFocal.value = '100'; }); }
    if (dom.resetLibraryBtn) { dom.resetLibraryBtn.addEventListener('click', () => { resetLibrary(); if (dom.libraryLensLabel) dom.libraryLensLabel.value = ''; if (dom.libraryLensFocal) dom.libraryLensFocal.value = '100'; }); }
    if (dom.exportLibraryCsvBtn) {
        dom.exportLibraryCsvBtn.addEventListener('click', () => {
            if (!state.library.length) {
                setSolverStatus('Library is empty - nothing to export', 'busy');
                return;
            }
            const csv = buildLibraryCsv(cloneLibraryEntries(state.library));
            downloadTextFile(`MaMMoth-library-${Date.now()}.csv`, csv, 'text/csv');
            setSolverStatus('Library CSV downloaded', 'success');
        });
    }
    if (dom.importLibraryCsvBtn && dom.importLibraryCsvInput) {
        dom.importLibraryCsvBtn.addEventListener('click', () => dom.importLibraryCsvInput.click());
        dom.importLibraryCsvInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const entries = parseLibraryCsv(reader.result);
                    if (!entries.length) throw new Error('No valid rows');
                    const imported = entries.map((entry) => ({
                        id: nextId('Catalog'),
                        label: entry.label?.trim()?.length ? entry.label.trim() : formatFocalDescriptor('Library lens', entry.focalLengthMm),
                        focalLengthMm: entry.focalLengthMm
                    }));
                    state.library = [...state.library, ...imported];
                    state.librarySequence = computeLibrarySequence(state.library);
                    renderLibraryTable();
                    invalidateSolutions('Library changed - rerun solver');
                    setSolverStatus(`${imported.length} library lens${imported.length === 1 ? '' : 'es'} appended`, 'success');
                } catch (error) {
                    console.error('Failed to import library CSV', error);
                    setSolverStatus('Library CSV import failed', 'busy');
                } finally {
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        });
    }
    dom.libraryTable.addEventListener('click', (event) => { const target = event.target; if (!(target instanceof HTMLElement)) return; if (target.dataset.action === 'remove-library-lens') { const row = target.closest('tr'); if (!row) return; state.library = state.library.filter((lens) => lens.id !== row.dataset.id); renderLibraryTable(); invalidateSolutions('Library changed - rerun solver'); } });
    dom.solutionsList.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const card = target.closest('.mm-result-card');
        const solutionId = card?.dataset.solutionId;
        if (target.dataset.action === 'apply-solution') {
            if (!solutionId) return;
            applySolution(solutionId);
        } else if (target.dataset.action === 'dismiss-solution') {
            if (!solutionId) return;
            state.solutions = state.solutions.filter((item) => item.id !== solutionId);
            if (state.selectedSolutionId === solutionId) { state.selectedSolutionId = null; }
            renderSolutionsList(state.solutions);
            if (!state.solutions.length) { setSolverStatus('All solutions dismissed', 'busy'); } else { setSolverStatus('Solution dismissed', 'busy'); }
        }
    });
    if (dom.toggleSolutionsList) { dom.toggleSolutionsList.addEventListener('click', () => { setSolutionsCollapsed(!state.solutionsCollapsed); }); updateSolutionsVisibility(); }
    if (dom.toggleAutoY) {
        dom.toggleAutoY.addEventListener('click', () => {
            state.autoScaleY = !state.autoScaleY;
            if (state.autoScaleY) {
                if (!state.canvas.customLimits) {
                    state.canvas.customLimits = { xMin: null, xMax: null, yLimit: null };
                } else {
                    state.canvas.customLimits.yLimit = null;
                }
                if (dom.canvasLimitY) {
                    dom.canvasLimitY.value = '';
                }
            }
            updateAutoYToggle();
            refreshAll();
        });
        updateAutoYToggle();
    }
    dom.toggleLock.addEventListener('click', () => { state.locked = !state.locked; dom.toggleLock.textContent = state.locked ? 'Unlock Layout' : 'Lock Layout'; dom.toggleLock.classList.toggle('mm-button-ghost', !state.locked); dom.beamCanvas.style.cursor = state.locked ? 'not-allowed' : 'crosshair'; if (state.locked) hideDragIndicator(); });
    dom.addLensQuick.addEventListener('click', () => { 
        if (state.editingLensId) { resetLensForm(true); renderLensTable(); } 
        const position = Number.isFinite(state.canvas.pointerZ) ? state.canvas.pointerZ : state.initial.reference + 0.3; 
        const label = dom.lensLabelInput.value;
        const focal = readNumericInput(dom.lensFocalInput, 100);
        addLens({ focalMm: focal, position, label, type: 'lens', roc: null }); 
        dom.lensLabelInput.value = ''; 
    });
    dom.addAnalyzerQuick.addEventListener('click', () => {
        const position = Number.isFinite(state.canvas.pointerZ) ? state.canvas.pointerZ : state.initial.reference + 0.4;
        const exclusionRadius = centimetersToMeters(Math.max(0, readNumericInput(dom.analyzerExclusionInput, 0)));
        const label = (dom.analyzerLabelInput?.value || '').trim();
        addAnalyzer({ position, exclusionRadius, label });
    });
    dom.beamCanvas.addEventListener('pointerdown', (event) => { if (state.locked) return; const z = pointerToZ(event.clientX); state.canvas.pointerZ = z; const hit = findComponentNear(z); if (hit) { event.preventDefault(); dom.beamCanvas.setPointerCapture(event.pointerId); dragState.active = true; dragState.type = hit.type; dragState.id = hit.id; dragState.startPointer = z; dragState.startPosition = hit.position; dragState.modified = false; dom.beamCanvas.style.cursor = 'grabbing'; const label = hit.type === 'lens' ? (state.components.lenses.find((l) => l.id === hit.id)?.label || hit.id) : (state.components.analyzers.find((a) => a.id === hit.id)?.label || hit.id); showDragIndicator(`${label} @ ${formatNumber(hit.position, { precision: 3, unit: 'm' })}`); } else { updateCanvasCursor(z); } });
    dom.beamCanvas.addEventListener('pointermove', (event) => { const z = pointerToZ(event.clientX); state.canvas.pointerZ = z; if (!dragState.active) { updateCanvasCursor(z); return; } event.preventDefault(); const delta = z - dragState.startPointer; const newPosition = dragState.startPosition + delta; if (dragState.type === 'lens') { const lens = state.components.lenses.find((l) => l.id === dragState.id); if (lens) { lens.position = newPosition; dragState.modified = true; showDragIndicator(`${lens.label || lens.id} → ${formatNumber(newPosition, { precision: 3, unit: 'm' })}`); refreshAll(); } } else if (dragState.type === 'analyzer') { const analyzer = state.components.analyzers.find((a) => a.id === dragState.id); if (analyzer) { analyzer.position = newPosition; dragState.modified = true; showDragIndicator(`${analyzer.label || analyzer.id} → ${formatNumber(newPosition, { precision: 3, unit: 'm' })}`); refreshAll(); } } });
    dom.beamCanvas.addEventListener('pointerup', (event) => { if (dragState.active && dragState.modified) { invalidateSolutions('Layout changed - rerun solver'); } if (dragState.active) { dragState.active = false; dragState.type = null; dragState.id = null; dragState.modified = false; } if (typeof dom.beamCanvas.hasPointerCapture === 'function' && dom.beamCanvas.hasPointerCapture(event.pointerId)) { dom.beamCanvas.releasePointerCapture(event.pointerId); } dom.beamCanvas.style.cursor = state.locked ? 'not-allowed' : 'crosshair'; hideDragIndicator(); });
    dom.beamCanvas.addEventListener('pointerleave', (event) => { hideDragIndicator(); dragState.active = false; dragState.modified = false; if (typeof dom.beamCanvas.hasPointerCapture === 'function' && dom.beamCanvas.hasPointerCapture(event.pointerId)) { dom.beamCanvas.releasePointerCapture(event.pointerId); } dom.beamCanvas.style.cursor = state.locked ? 'not-allowed' : 'crosshair'; });
    dom.beamCanvas.addEventListener('pointercancel', (event) => { hideDragIndicator(); dragState.active = false; dragState.modified = false; if (typeof dom.beamCanvas.hasPointerCapture === 'function' && dom.beamCanvas.hasPointerCapture(event.pointerId)) { dom.beamCanvas.releasePointerCapture(event.pointerId); } dom.beamCanvas.style.cursor = state.locked ? 'not-allowed' : 'crosshair'; });
    dom.exportConfigBtn.addEventListener('click', () => {
        const payload = buildSharePayload(null);
        downloadTextFile(`MaMMoth-config-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
        setSolverStatus('Configuration exported', 'success');
    });
    dom.exportPlotDataBtn.addEventListener('click', exportPlotData);
    dom.downloadPlotBtn.addEventListener('click', downloadPlot);
    if (dom.copySettingsLinkBtn) {
        dom.copySettingsLinkBtn.addEventListener('click', () => {
            copySettingsLink();
        });
    }
    dom.importConfigBtn.addEventListener('click', () => { dom.importConfigFile.click(); });
    dom.importConfigFile.addEventListener('change', (event) => {
        const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                applyConfigurationPayload(data);
                setSolverStatus('Configuration loaded', 'success');
            } catch (error) { console.error('Failed to load configuration', error); setSolverStatus('Import failed', 'busy'); }
        };
        reader.readAsText(file);
    });
    if (dom.versionTag) {
        dom.versionTag.textContent = `Moth v${APP_VERSION}`;
    }
    applyQueryInitialBeamDefaults();
    setupInputListeners();
    resetLibrary({ skipInvalidate: true });
    loadConfigurationFromQuery();
    resetLensForm(true); state.chart = initChart(); refreshAll();
})();
