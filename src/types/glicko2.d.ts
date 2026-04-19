declare module "glicko2" {
  export interface Glicko2Config {
    tau?: number;
    rating?: number;
    rd?: number;
    vol?: number;
  }

  export interface Glicko2Player {
    getRating(): number;
    getRd(): number;
    getVol(): number;
  }

  export class Glicko2 {
    constructor(config?: Glicko2Config);
    makePlayer(rating?: number, rd?: number, vol?: number): Glicko2Player;
    updateRatings(matches: any): void;
  }
}
