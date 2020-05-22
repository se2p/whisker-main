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
 * along with Whisker. ßIf not, see http://www.gnu.org/licenses/.
 *
 */

import {Chromosome} from "../Chromosome";
import {Selection} from "../Selection";
import {List} from "../../utils/List";
import {Randomness} from "../../utils/Randomness";
import {FitnessFunction} from "../FitnessFunction";
import {Mutation} from "../Mutation";
import {Crossover} from "../Crossover";
import {OneMaxFitnessFunction} from "../../bitstring/OneMaxFitnessFunction";
import {BitstringChromosome} from "../../bitstring/BitstringChromosome";

/**
 * The tournament selection operator.
 *
 * @param <C> The chromosome type.
 */
export class TournamentSelection<C extends Chromosome> implements Selection<C> {

    private _tournamentSize = 2;

    private _fitnessFunction: FitnessFunction<C>;

    constructor(tournamentSize, fitnessFunction: FitnessFunction<C>) {
        this._tournamentSize = tournamentSize;
        this._fitnessFunction = fitnessFunction;
    }

        /**
     * Selects a chromosome from the given population and returns the result.
     *
     * @param population The population of chromosomes from which to select, sorted in ascending order.
     * @returns the selected chromosome.
     */
    apply(population: List<C>): C {
        let iteration = 0;
        let winner = Randomness.getInstance().pickRandomElementFromList(population);
        let bestFitness = this._fitnessFunction.getFitness(winner);
        while(iteration < this._tournamentSize) {
            const candidate = Randomness.getInstance().pickRandomElementFromList(population);
            const candidateFitness = this._fitnessFunction.getFitness(candidate);

            if(this._fitnessFunction.compare(candidateFitness, bestFitness) > 0) {
                bestFitness = candidateFitness;
                winner = candidate;
            }
            iteration++;
        }
        return winner;
    }
}
