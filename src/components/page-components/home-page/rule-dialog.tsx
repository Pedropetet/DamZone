import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RuleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="px-6 py-4 text-md" variant="default" size="lg">
          Spelregels
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Spelregels van Dammen</DialogTitle>
        <DialogHeader>Spelregels</DialogHeader>
        <div className="text-sm leading-relaxed">
          <p>Hier komen de spelregels:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Het spel wordt gespeeld op een bord van 10×10.</li>
            <li>Elke speler start met 20 schijven.</li>
            <li>Normale schijven bewegen diagonaal één vak naar voren.</li>
            <li>
              Normale schijven mogen zowel vooruit als achteruit slaan. Slaan
              mag alleen als het veld achter het te slaan stuk vrij is.
            </li>
            <li>
              Als er een mogelijkheid is om te slaan, ben je verplicht dit te
              doen (slagverplichting).
            </li>
            <li>
              Na een slaande zet moet dezelfde schijf opnieuw slaan als dat
              mogelijk is (meervoudig slaan).
            </li>
            <li>
              Wanneer een schijf de achterste rij van de tegenstander bereikt,
              wordt deze een dam.
            </li>
            <li>
              Dammen bewegen diagonaal over meerdere vakken, vooruit en
              achteruit, en slaan eveneens over afstand.
            </li>
            <li>
              Het spel eindigt wanneer een speler geen stukken meer heeft of
              geen geldige zet meer kan doen.
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
