const Runtime = require('scratch-vm/src/engine/runtime');
const Stepper = require('./stepper');

const log = require('minilog')('vm-wrapper');

const Sprites = require('./sprites');
const {Callbacks} = require('./callbacks');
const {Inputs} = require('./inputs');
const {RandomInputs} = require('./random-input');
const {Constraints} = require('./constraints');

class VMWrapper {
    /**
     * @param {VirtualMachine} vm .
     */
    constructor (vm) {
        /**
         * @type {VirtualMachine}
         */
        this.vm = vm;

        /**
         * @type {Stepper}
         */
        this.stepper = new Stepper(Runtime.THREAD_STEP_INTERVAL);

        /**
         * @type {Sprites}
         */
        this.sprites = new Sprites(this);

        /**
         * @type {Callbacks}
         */
        this.callbacks = new Callbacks(this);

        /**
         * @type {Inputs}
         */
        this.inputs = new Inputs(this);

        /**
         * @type {RandomInputs}
         */
        this.randomInputs = new RandomInputs(this);

        /**
         * @type {Constraints}
         */
        this.constraints = new Constraints(this);

        /**
         * @type {string}
         */
        this.actionOnConstraintFailure = VMWrapper.ON_CONSTRAINT_FAILURE_FAIL;

        /**
         * @type {number}
         */
        this.startTime = 0;

        /**
         * @type {number}
         */
        this.runStartTime = 0;

        /**
         * @type {number}
         */
        this.stepsExecuted = 0;

        /**
         * @type {number}
         */
        this.runStartStepsExecuted = 0;

        /**
         * @type {boolean}
         */
        this.running = false;

        /**
         * @type {boolean}
         */
        this.aborted = false;

        /**
         * @type {boolean}
         */
        this.projectRunning = false;

        this._onRunStart = this.onRunStart.bind(this);
        this._onRunStop = this.onRunStop.bind(this);
        this._onTargetCreated = this.sprites.onTargetCreated.bind(this.sprites);
        this.vm.on(Runtime.PROJECT_RUN_START, this._onRunStart);
        this.vm.on(Runtime.PROJECT_RUN_STOP, this._onRunStop);
        this.vm.runtime.on('targetWasCreated', this._onTargetCreated);
    }

    /**
     * @param {string} action .
     * @returns {string} .
     */
    onConstraintFailure (action) {
        if (action) {
            this.actionOnConstraintFailure = action;
        }
        return this.actionOnConstraintFailure;
    }

    step () {
        this.callbacks.callCallbacks(false);

        if (!this.isRunning()) return;

        this.randomInputs.performRandomInput();
        this.inputs.performInputs();

        this.sprites.update();
        this.vm.runtime._step();

        if (!this.isRunning()) return;

        this.callbacks.callCallbacks(true);

        if (!this.isRunning()) return;

        return this.constraints.checkConstraints();
    }

    /**
     * @param {Function?} condition .
     * @param {number=} timeout .
     * @param {number=} steps .
     * @returns {number} .
     */
    async run (condition, timeout, steps) {
        if (this.isRunning()) {
            throw new Error('Warning: A run was started while another run was still going! Make sure you are not ' +
                          'missing any await-statements in your test.');
        }

        condition = condition || (() => false);
        timeout = timeout || Infinity;
        steps = steps || Infinity;

        this.running = true;
        this.runStartTime = Date.now();
        this.runStartStepsExecuted = this.getTotalStepsExecuted();

        let constraintError = null;

        while (this.isRunning() &&
               this.getRunTimeElapsed() < timeout &&
               this.getRunStepsExecuted() < steps &&
               !condition()) {

            constraintError = await this.stepper.step(this.step.bind(this));

            this.stepsExecuted++;

            if (constraintError &&
               (this.actionOnConstraintFailure === VMWrapper.ON_CONSTRAINT_FAILURE_FAIL ||
                this.actionOnConstraintFailure === VMWrapper.ON_CONSTRAINT_FAILURE_STOP)) {
                break;
            }
        }

        if (this.aborted) {
            throw new Error('Run was aborted!');
        }

        this.running = false;
        const timeElapsed = this.getRunTimeElapsed();

        this.inputs.updateInputs(timeElapsed);

        if (constraintError && this.actionOnConstraintFailure === VMWrapper.ON_CONSTRAINT_FAILURE_FAIL) {
            throw constraintError;
        }

        return timeElapsed;
    }

    /**
     * @param {number} time .
     * @returns {number} .
     */
    async runForTime (time) {
        return await this.run(null, time);
    }

    /**
     * @param {Function} condition .
     * @param {number=} timeout .
     * @returns {number} .
     */
    async runUntil (condition, timeout) {
        return await this.run(condition, timeout);
    }

    /**
     * @param {Function} callback .
     * @param {number=} timeout .
     * @returns {number} .
     */
    async runUntilChanges (callback, timeout) {
        const initialValue = callback();
        return await this.run(() => callback() !== initialValue, timeout);
    }

    /**
     * @param {number} steps .
     * @param {number=} timeout .
     * @returns {number} .
     */
    async runForSteps (steps, timeout) {
        return await this.run(null, timeout, steps);
    }

    cancelRun () {
        this.running = false;
    }

    abort () {
        this.cancelRun();
        this.aborted = true;
        log.warn("Run aborted");
    }

    /**
     * @return {number} .
     */
    getTotalTimeElapsed () {
        return (Date.now() - this.startTime) * this.accelerationFactor;
    }

    /**
     * @return {number} .
     */
    getRunTimeElapsed () {
        return (Date.now() - this.runStartTime) * this.accelerationFactor;
    }

    /**
     * @return {number} .
     */
    getTotalStepsExecuted () {
        return this.stepsExecuted;
    }

    /**
     * @return {number} .
     */
    getRunStepsExecuted () {
        return this.stepsExecuted - this.runStartStepsExecuted;
    }

    /**
     * @param {string} project .
     * @param {number} accelerationFactor .
     *
     * @returns {Promise<void>} .
     */
    async setup (project, accelerationFactor = 1) {
        const setStepTime = factor => {
            this.vm.runtime.currentStepTime = Runtime.THREAD_STEP_INTERVAL;
            this.stepper.setStepTime(Runtime.THREAD_STEP_INTERVAL / factor);
            clearInterval(this.vm.runtime._steppingInterval);
            this.accelerationFactor = factor;
        };
        setStepTime(accelerationFactor);

        this.instrumentPrimitive('control_wait', 'DURATION');
        this.instrumentPrimitive('looks_sayforsecs', 'SECS');
        this.instrumentPrimitive('looks_thinkforsecs', 'SECS');
        this.instrumentPrimitive('motion_glidesecstoxy', 'SECS');
        this.instrumentPrimitive('motion_glideto', 'SECS');

        this.instrumentDevice('clock', 'projectTimer');

        return await this.vm.loadProject(project);
    }

    instrumentDevice (deviceName, method) {
        const device = this.vm.runtime.ioDevices[deviceName];
        let original = device[method];

        if (original.isInstrumented) {
            original = original.primitive;
        }

        const instrumented = () => original.call(device) * this.accelerationFactor;
        instrumented.isInstrumented = true;
        instrumented.primitive = original;
        device[method] = instrumented;
    }

    instrumentPrimitive (primitive, argument) {
        let original = this.vm.runtime._primitives[primitive];

        if (original.isInstrumented) {
            original = original.primitive
        }

        const instrumented = (args, util) => {
            const clone = {...args};
            clone[argument] = args[argument] / this.accelerationFactor;
            return original(clone, util);
        };
        instrumented.isInstrumented = true;
        instrumented.primitive = original;
        this.vm.runtime._primitives[primitive] = instrumented;
    }

    start () {
        this.callbacks.clearCallbacks();
        this.inputs.clearInputs();
        this.constraints.clearConstraints();
        this.sprites.reset();

        this.inputs.resetMouse();
        this.inputs.resetKeyboard();

        this.vm.greenFlag();
        this.startTime = Date.now();

        this.aborted = false;
    }

    end () {
        this.cancelRun();
        this.vm.stopAll();
        this.vm.runtime._step();

        this.inputs.resetMouse();
        this.inputs.resetKeyboard();

        this.vm.removeListener(Runtime.PROJECT_RUN_START, this._onRunStart);
        this.vm.removeListener(Runtime.PROJECT_RUN_STOP, this._onRunStop);
        this.vm.runtime.removeListener('targetWasCreated', this._onTargetCreated);
    }

    // TODO: reset sprites on green flag?
    greenFlag () {
        this.vm.greenFlag();
    }

    /**
     * @param {number} x .
     * @param {number} y .
     * @return {{x: number, y: number}} .
     */
    getScratchCoords (x, y) {
        const rect = this.vm.runtime.renderer.gl.canvas.getBoundingClientRect();
        const [nWidth, nHeight] = this.vm.runtime.renderer.getNativeSize();
        return {
            x: (nWidth / rect.width) * (x - (rect.width / 2)),
            y: -(nHeight / rect.height) * (y - (rect.height / 2))
        };
    }

    /**
     * @param {number} x .
     * @param {number} y .
     * @return {{x: number, y: number}} .
     */
    getClientCoords (x, y) {
        const rect = this.vm.runtime.renderer.gl.canvas.getBoundingClientRect();
        const [nWidth, nHeight] = this.vm.runtime.renderer.getNativeSize();
        return {
            x: (x * (rect.width / nWidth)) + (rect.width / 2),
            y: (-y * (rect.height / nHeight)) + (rect.height / 2)
        };
    }

    /**
     * @return {{width: number, height: number}} .
     */
    getStageSize () {
        const [width, height] = this.vm.runtime.renderer.getNativeSize();
        return {
            width,
            height
        };
    }

    /**
     * @return {DOMRect} .
     */
    getCanvasRect () {
        return this.vm.runtime.renderer.gl.canvas.getBoundingClientRect();
    }

    isRunning () {
        return this.running;
    }

    isProjectRunning () {
        return this.projectRunning;
    }

    onRunStart () {
        this.projectRunning = true;
    }

    onRunStop () {
        this.projectRunning = false;
    }

    /**
     * @returns {string} .
     */
    static get ON_CONSTRAINT_FAILURE_FAIL () {
        return 'fail';
    }

    /**
     * @returns {string} .
     */
    static get ON_CONSTRAINT_FAILURE_STOP () {
        return 'stop';
    }

    /**
     * @returns {string} .
     */
    static get ON_CONSTRAINT_FAILURE_NOTHING () {
        return 'nothing';
    }
}

module.exports = VMWrapper;
