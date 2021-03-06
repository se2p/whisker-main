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

import {List} from '../../../src/whisker/utils/List';
import {SinglePointCrossover} from "../../../src/whisker/search/operators/SinglePointCrossover";
import {IntegerListChromosome} from "../../../src/whisker/integerlist/IntegerListChromosome";
import {IntegerListMutation} from "../../../src/whisker/integerlist/IntegerListMutation";

describe('IntegerListSinglePointCrossover', () => {

    test('False to true', () => {
        const parent1Ints = new List<number>();
        parent1Ints.add(1);
        parent1Ints.add(2);
        const parent1 = new IntegerListChromosome(parent1Ints,
            new IntegerListMutation(0, 10), new SinglePointCrossover<IntegerListChromosome>());

        const parent2Ints = new List<number>();
        parent2Ints.add(3);
        parent2Ints.add(4);
        const parent2 = new IntegerListChromosome(parent2Ints,
            new IntegerListMutation(0, 10), new SinglePointCrossover<IntegerListChromosome>());

        const crossover = new SinglePointCrossover<IntegerListChromosome>();
        const offspring = crossover.applyAtPosition(parent1, parent2, 1);
        const child1Ints = offspring.getFirst().getGenes();
        const child2Ints = offspring.getSecond().getGenes();

        expect(child1Ints.size()).toBe(parent1Ints.size());
        expect(child2Ints.size()).toBe(parent1Ints.size());
        expect(child1Ints.get(0) + child1Ints.get(1)).toBe(5); // 1+4 or 2+3
        expect(child2Ints.get(0) + child2Ints.get(1)).toBe(5); // 1+4 or 2+3
    });

});
