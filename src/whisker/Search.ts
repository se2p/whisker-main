/*
 * Copyright (C) 2020 Whisker contributors
 *
 * This file is part of the Whisker test generator for Scratch.
 *
 * Whisker is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Whisker is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Whisker. If not, see http://www.gnu.org/licenses/.
 *
 */

/* eslint-disable no-console */

import {TestSuiteWriter} from './testgenerator/TestSuiteWriter';
import {TestGenerator} from "./testgenerator/TestGenerator";
import WhiskerUtil from "../test/whisker-util.js";
import {WhiskerTest} from "./testgenerator/WhiskerTest";
import {List} from "./utils/List";
import VirtualMachine from "scratch-vm/src/virtual-machine"
import {WhiskerSearchConfiguration} from "./utils/WhiskerSearchConfiguration";
import {Container} from "./utils/Container";
import {StatisticsCollector} from "./utils/StatisticsCollector";
import {Randomness} from "./utils/Randomness";
import {seedScratch} from "../util/random";

export class Search {

    public vm: VirtualMachine;

    constructor(vm: VirtualMachine) {
        this.vm = vm;
    }

    createTestSuite(projectFile: string, testSuiteFile: string, config: WhiskerSearchConfiguration): List<WhiskerTest> {
//        const scratchProject = new ScratchProject(projectFile);

        const testGenerator = this._selectTestGenerator(config);
        const testSuite = testGenerator.generateTests(null);

        const testSuiteWriter = new TestSuiteWriter();
        testSuiteWriter.writeTests(testSuiteFile, testSuite);

        return testSuite;
    }

    _selectTestGenerator(config: WhiskerSearchConfiguration): TestGenerator {

        // TODO: Select RandomTestGenerator, IterativeSearchBasedTestGenerator, or MOGenerator
        return config.getTestGenerator()
    }

    execute(project, config: WhiskerSearchConfiguration): List<WhiskerTest> {
        console.log("Whisker-Main: test generation")

        const testGenerator: TestGenerator = config.getTestGenerator();
        const whiskerTests: List<WhiskerTest> = testGenerator.generateTests(project);
        //todo export whisker tests
        return whiskerTests;
    }

    public getVirtualMachine() {
        if (this.vm == null) {
            throw new Error("Not Initialized");
        }
        return this.vm;
    }

    private printTests(tests: List<WhiskerTest>): void {
        let i = 0;
        for (const test of tests) {
            console.log("Test "+i+": \n" + test.toString());
            i++;
        }
    }

    public run(vm, project, configRaw: string, accelerationFactor: number): Promise<string> {
        console.log("Whisker-Main: Starting Search based algorithm");

        const util = new WhiskerUtil(vm, project);
        const configJson = JSON.parse(configRaw);
        const config = new WhiskerSearchConfiguration(configJson);

        Container.config = config;
        Container.vm = vm;
        Container.vmWrapper = util.vmWrapper;
        Container.acceleration = accelerationFactor;

        async function init(search: Search) {
            await util.prepare(accelerationFactor || 1);
            util.start();
            const seed = Date.now();
            Randomness.setInitialSeed(seed);
            seedScratch(seed);
            StatisticsCollector.getInstance().reset();
            const tests = search.execute(project, config);
            search.printTests(tests);
            const csvString: string = StatisticsCollector.getInstance().asCsv();
            console.log(csvString);
            return csvString;
        }

        return init(this);

    }
}
