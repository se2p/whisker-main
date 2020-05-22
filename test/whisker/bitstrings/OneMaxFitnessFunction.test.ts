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

import {BitstringChromosome} from '../../../src/whisker/bitstring/BitstringChromosome';
import {List} from '../../../src/whisker/utils/List';
import {OneMaxFitnessFunction} from '../../../src/whisker/bitstring/OneMaxFitnessFunction';
import {BitflipMutation} from "../../../src/whisker/bitstring/BitflipMutation";
import {SinglePointCrossover} from "../../../src/whisker/search/operators/SinglePointCrossover";

describe('OneMaxFitnessFunction', () => {

    test('All false', () => {
        const bits = new List<Boolean>();
        bits.add(false);
        bits.add(false);
        const chromosome = new BitstringChromosome(bits,
            new BitflipMutation(), new SinglePointCrossover<BitstringChromosome>());

        const fitnessFunction = new OneMaxFitnessFunction(2);

        expect(fitnessFunction.getFitness(chromosome)).toBe(0);
    });

    test('All true', () => {
        const bits = new List<Boolean>();
        bits.add(true);
        bits.add(true);
        const chromosome = new BitstringChromosome(bits,
            new BitflipMutation(), new SinglePointCrossover<BitstringChromosome>());

        const fitnessFunction = new OneMaxFitnessFunction(2);

        expect(fitnessFunction.getFitness(chromosome)).toBe(2);
    });

    test('Mixed', () => {
        const bits = new List<Boolean>();
        bits.add(true);
        bits.add(false);
        const chromosome = new BitstringChromosome(bits,
            new BitflipMutation(), new SinglePointCrossover<BitstringChromosome>());

        const fitnessFunction = new OneMaxFitnessFunction(2);

        expect(fitnessFunction.getFitness(chromosome)).toBe(1);
    });

    test('Check optimality', () => {
        const fitnessFunction = new OneMaxFitnessFunction(2);

        expect(fitnessFunction.isOptimal(0)).toBeFalsy();
        expect(fitnessFunction.isOptimal(1)).toBeFalsy();
        expect(fitnessFunction.isOptimal(2)).toBeTruthy();
    });

    test('Check comparison', () => {
        const fitnessFunction = new OneMaxFitnessFunction(2);

        expect(fitnessFunction.compare(1, 0)).toBeGreaterThan(0);
        expect(fitnessFunction.compare(0, 1)).toBeLessThan(0);
        expect(fitnessFunction.compare(1, 1)).toBe(0);
    });
});
