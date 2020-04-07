import { Chromosome } from "../chromosomes/chromosome";
import { List } from "../util/list";

/**
 * The selection operator is responsible for determining which chromosomes should be subjected to
 * mutation and crossover.
 * 
 * @param <C> the type of chromosomes this selection function is compatible with
 * @author Sophia Geserer
 */
export interface Selection<C extends Chromosome<C>> {

    /**
     * Selects a chromosome from the given population and returns the result.
     * @param population the population of chromosomes from which to select
     * @returns the selected chromosome
     */
    apply(population: List<C>): C;

}