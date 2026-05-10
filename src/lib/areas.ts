import type { StateData, CityData } from "@/lib/areas-types";
export type { StateData, CityData, AreaFAQ } from "@/lib/areas-types";

import { texas } from "@/content/areas/texas";
import { california } from "@/content/areas/california";
import { florida } from "@/content/areas/florida";
import { ohio } from "@/content/areas/ohio";
import { georgia } from "@/content/areas/georgia";
import { illinois } from "@/content/areas/illinois";
import { tennessee } from "@/content/areas/tennessee";
import { pennsylvania } from "@/content/areas/pennsylvania";
import { northCarolina } from "@/content/areas/north-carolina";
import { newYork } from "@/content/areas/new-york";
import { michigan } from "@/content/areas/michigan";
import { indiana } from "@/content/areas/indiana";
import { missouri } from "@/content/areas/missouri";
import { colorado } from "@/content/areas/colorado";
import { arizona } from "@/content/areas/arizona";
import { virginia } from "@/content/areas/virginia";
import { washington } from "@/content/areas/washington";
import { nevada } from "@/content/areas/nevada";
import { oregon } from "@/content/areas/oregon";
import { newJersey } from "@/content/areas/new-jersey";
import { mississippi } from "@/content/areas/mississippi";
import { alabama } from "@/content/areas/alabama";
import { kentucky } from "@/content/areas/kentucky";
import { arkansas } from "@/content/areas/arkansas";
import { louisiana } from "@/content/areas/louisiana";
import { minnesota } from "@/content/areas/minnesota";
import { wisconsin } from "@/content/areas/wisconsin";
import { iowa } from "@/content/areas/iowa";
import { kansas } from "@/content/areas/kansas";
import { oklahoma } from "@/content/areas/oklahoma";
import { nebraska } from "@/content/areas/nebraska";
import { southCarolina } from "@/content/areas/south-carolina";
import { maryland } from "@/content/areas/maryland";
import { connecticut } from "@/content/areas/connecticut";
import { massachusetts } from "@/content/areas/massachusetts";
import { utah } from "@/content/areas/utah";
import { newMexico } from "@/content/areas/new-mexico";
import { westVirginia } from "@/content/areas/west-virginia";
import { idaho } from "@/content/areas/idaho";
import { montana } from "@/content/areas/montana";
import { northDakota } from "@/content/areas/north-dakota";
import { southDakota } from "@/content/areas/south-dakota";
import { wyoming } from "@/content/areas/wyoming";
import { maine } from "@/content/areas/maine";
import { newHampshire } from "@/content/areas/new-hampshire";
import { vermont } from "@/content/areas/vermont";
import { rhodeIsland } from "@/content/areas/rhode-island";
import { delaware } from "@/content/areas/delaware";
import { alaska } from "@/content/areas/alaska";
import { hawaii } from "@/content/areas/hawaii";

export const ALL_STATES: StateData[] = [
  texas, california, florida, ohio, georgia, illinois, tennessee,
  pennsylvania, northCarolina, newYork, michigan, indiana, missouri,
  colorado, arizona, virginia, washington, nevada, oregon, newJersey,
  mississippi, alabama, kentucky, arkansas, louisiana,
  minnesota, wisconsin, iowa, kansas, oklahoma, nebraska, southCarolina,
  maryland, connecticut, massachusetts, utah, newMexico, westVirginia,
  idaho, montana, northDakota, southDakota, wyoming, maine, newHampshire,
  vermont, rhodeIsland, delaware, alaska, hawaii,
];

export function getState(slug: string): StateData | undefined {
  return ALL_STATES.find((s) => s.slug === slug);
}

export function getCity(stateSlug: string, citySlug: string): CityData | undefined {
  return getState(stateSlug)?.cities.find((c) => c.slug === citySlug);
}
