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

import {TestGenerator} from './TestGenerator';
import {ScratchProject} from '../scratch/ScratchProject';
import {List} from '../utils/List';
import {WhiskerTest} from './WhiskerTest';
import {SearchAlgorithmProperties} from '../search/SearchAlgorithmProperties';
import {ChromosomeGenerator} from "../search/ChromosomeGenerator";
import {TestChromosome} from "../testcase/TestChromosome";
import {SearchAlgorithm} from "../search/SearchAlgorithm";
import {Selection} from "../search/Selection";
import {NotSupportedFunctionException} from "../core/exceptions/NotSupportedFunctionException";
import {FitnessFunction} from "../search/FitnessFunction";
import {StatisticsCollector} from "../utils/StatisticsCollector";

/**
 * A naive approach to generating tests is to simply
 * use the chromosome factory and generate completely
 * random tests.
 */
export class RandomTestGenerator extends TestGenerator implements SearchAlgorithm<TestChromosome> {

    private _startTime: number;

    private _iterations = 0;

    private _tests = new List<TestChromosome>();

    private _archive = new Map<number, TestChromosome>();

    async generateTests(project: ScratchProject): Promise<List<WhiskerTest>> {
        this._fitnessFunctions = this.extractCoverageGoals();
        StatisticsCollector.getInstance().fitnessFunctionCount = this._fitnessFunctions.size;
        this._startTime = Date.now();
        let fullCoverageReached = false;

        const chromosomeGenerator = this._config.getChromosomeGenerator();
        const stoppingCondition = this._config.getSearchAlgorithmProperties().getStoppingCondition();

        while (!(stoppingCondition.isFinished(this))) {
            console.log("Iteration " + this._iterations
                + ", covered goals: " + this._archive.size + "/" + this._fitnessFunctions.size);
            this._iterations++;
            StatisticsCollector.getInstance().incrementIterationCount();
            const testChromosome = chromosomeGenerator.get();
            await testChromosome.evaluate();
            this.updateArchive(testChromosome);
            if(this._archive.size == this._fitnessFunctions.size && !fullCoverageReached) {
                fullCoverageReached = true;
                StatisticsCollector.getInstance().createdTestsToReachFullCoverage = this._iterations;
                StatisticsCollector.getInstance().timeToReachFullCoverage = Date.now() - this._startTime;
            }
        }
        this._tests = new List<TestChromosome>(Array.from(this._archive.values())).distinct();
        const testSuite = await this.getTestSuite(this._tests);
        StatisticsCollector.getInstance().createdTestsCount = this._iterations;
        this.collectStatistics(testSuite);
        return testSuite;
    }

    private updateArchive(chromosome: TestChromosome): void {
        for (const fitnessFunctionKey of this._fitnessFunctions.keys()) {
            const fitnessFunction = this._fitnessFunctions.get(fitnessFunctionKey);
            let bestLength = this._archive.has(fitnessFunctionKey)
                ? this._archive.get(fitnessFunctionKey).getLength()
                : Number.MAX_SAFE_INTEGER;
            const candidateFitness = fitnessFunction.getFitness(chromosome);
            const candidateLength = chromosome.getLength();
            if (fitnessFunction.isOptimal(candidateFitness) && candidateLength < bestLength) {
                bestLength = candidateLength;
                if (!this._archive.has(fitnessFunctionKey)) {
                    StatisticsCollector.getInstance().incrementCoveredFitnessFunctionCount();
                }
                this._archive.set(fitnessFunctionKey, chromosome);
                console.log("Found test for goal: " + fitnessFunction);
            }
        }
    }

    getCurrentSolution(): List<TestChromosome> {
        return this._tests;
    }

    getFitnessFunctions(): Iterable<FitnessFunction<TestChromosome>> {
        return this._fitnessFunctions.values();
    }

    getNumberOfIterations(): number {
        return this._iterations;
    }

    getStartTime(): number {
        return this._startTime;
    }

    async findSolution(): Promise<List<TestChromosome>> {
        throw new NotSupportedFunctionException();
    }

    setChromosomeGenerator(generator: ChromosomeGenerator<TestChromosome>): void {
        throw new NotSupportedFunctionException();
    }

    setFitnessFunction(fitnessFunction: FitnessFunction<TestChromosome>): void {
        throw new NotSupportedFunctionException();
    }

    setFitnessFunctions(fitnessFunctions: Map<number, FitnessFunction<TestChromosome>>): void {
        throw new NotSupportedFunctionException();
    }

    setHeuristicFunctions(heuristicFunctions: Map<number, Function>): void {
        throw new NotSupportedFunctionException();
    }

    setProperties(properties: SearchAlgorithmProperties<TestChromosome>): void {
        throw new NotSupportedFunctionException();
    }

    setSelectionOperator(selectionOperator: Selection<TestChromosome>): void {
        throw new NotSupportedFunctionException();
    }
}
