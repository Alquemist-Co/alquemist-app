"use client";

import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { RecipeListItem } from "@/lib/actions/inventory";

type Props = {
  initialData: RecipeListItem[];
};

export function RecipeList({ initialData }: Props) {
  const active = initialData.filter((r) => r.isActive);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Recetas</h1>
        <Link href="/inventory/recipes/new">
          <Button icon={Plus} size="sm">
            Nueva
          </Button>
        </Link>
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin recetas"
          description="Crea la primera receta para transformar materias primas en productos."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((r) => (
            <Link key={r.id} href={`/inventory/recipes/${r.id}`}>
              <Card className="hover:border-brand/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">
                        {r.name}
                      </span>
                      <Badge variant="outlined">
                        {r.ingredientCount} ingrediente{r.ingredientCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <span className="font-mono text-xs text-text-secondary">
                      {r.code}
                    </span>
                    <span className="text-xs text-text-secondary">
                      Produce: {r.outputProductName} ({r.outputProductSku}) — {r.baseQuantity} {r.baseUnitCode}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
