"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Icon } from "@iconify/react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

/* ---------------- API endpoints ---------------- */
const API = {
  bonus: "http://localhost:8000/bonus-setup",
  serviceProviders: "http://localhost:8000/service-provider",
  companies: "http://localhost:8000/company",
  branches: "http://localhost:8000/branches",
};

const MIN_CHARS = 1;

/* ---------------- Types ---------------- */
interface BonusSetupUI {
  id: string;
  serviceProviderID: number | null;
  companyID: number | null;
  branchesID: number | null;
  serviceProvider: string;
  companyName: string;
  branchName: string;
  bonusName: string;
  description: string;
  bonusBasedOn: "Basic" | "Gross";
  percentageOfBonus: number;
  createdAt: string;
}

type ApiBonus = {
  id: number;
  serviceProviderID: number | null;
  companyID: number | null;
  branchesID: number | null;
  BonusName: string | null;
  bonusDescription: string | null;
  bonusBasedOn: string | null;   // "Basic" | "Gross" (stored as string)
  bonusPercentage: string | null; // stored as string in DB
  createdAt?: string;
  serviceProvider?: { id: number; companyName?: string | null } | null;
  company?: { id: number; companyName?: string | null } | null;
  branches?: { id: number; branchName?: string | null } | null;
};

type SP = { id: number; companyName?: string | null };
type CO = { id: number; companyName?: string | null };
type BR = { id: number; branchName?: string | null };

/* ---------------- Component ---------------- */
export function BonusSetupManagement() {
  const [bonuses, setBonuses] = useState<BonusSetupUI[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<BonusSetupUI | null>(null);

  // FK autocomplete lists
  const [spList, setSpList] = useState<SP[]>([]);
  const [coList, setCoList] = useState<CO[]>([]);
  const [brList, setBrList] = useState<BR[]>([]);
  const [spLoading, setSpLoading] = useState(false);
  const [coLoading, setCoLoading] = useState(false);
  const [brLoading, setBrLoading] = useState(false);
  const spRef = useRef<HTMLDivElement | null>(null);
  const coRef = useRef<HTMLDivElement | null>(null);
  const brRef = useRef<HTMLDivElement | null>(null);

  // Form: keep IDs + visible text
  const [formData, setFormData] = useState({
    serviceProviderID: null as number | null,
    companyID: null as number | null,
    branchesID: null as number | null,
    spAutocomplete: "",
    coAutocomplete: "",
    brAutocomplete: "",
    bonusName: "",
    description: "",
    bonusBasedOn: "Basic" as "Basic" | "Gross",
    percentageOfBonus: 0,
  });

  /* -------- click outside to close suggestion popovers -------- */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (spRef.current && !spRef.current.contains(t)) setSpList([]);
      if (coRef.current && !coRef.current.contains(t)) setCoList([]);
      if (brRef.current && !brRef.current.contains(t)) setBrList([]);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  /* ---------------- initial load ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API.bonus);
        const data: ApiBonus[] = await res.json();
        setBonuses(data.map(mapApiToUi));
      } catch (e) {
        console.error("Failed to load bonuses", e);
      }
    })();
  }, []);

  /* ---------------- helpers ---------------- */
  function safeNum(v: string | null | undefined, d = 0) {
    const n = parseFloat(v ?? "");
    return Number.isFinite(n) ? n : d;
  }

  function mapApiToUi(x: ApiBonus): BonusSetupUI {
    return {
      id: String(x.id),
      serviceProviderID: x.serviceProviderID ?? null,
      companyID: x.companyID ?? null,
      branchesID: x.branchesID ?? null,
      serviceProvider: x.serviceProvider?.companyName ?? "-",
      companyName: x.company?.companyName ?? "-",
      branchName: x.branches?.branchName ?? "-",
      bonusName: x.BonusName ?? "-",
      description: x.bonusDescription ?? "",
      bonusBasedOn: (x.bonusBasedOn === "Gross" ? "Gross" : "Basic") as "Basic" | "Gross",
      percentageOfBonus: safeNum(x.bonusPercentage, 0),
      createdAt: x.createdAt ? x.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
    };
  }

  function mapUiToPayload(fd: typeof formData) {
    return {
      serviceProviderID: fd.serviceProviderID,
      companyID: fd.companyID,
      branchesID: fd.branchesID,
      BonusName: fd.bonusName,
      bonusDescription: fd.description,
      bonusBasedOn: fd.bonusBasedOn,           // string in DB
      bonusPercentage: String(fd.percentageOfBonus), // DB expects string
    };
  }

  async function robustGet(url: string, q?: string) {
    try {
      const res = await fetch(q ? `${url}?q=${encodeURIComponent(q)}` : url);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    } catch {
      const res2 = await fetch(url);
      if (!res2.ok) throw new Error(String(res2.status));
      return res2.json();
    }
  }

  /* ---------------- debounced FK fetchers ---------------- */
  const runFetchSP = debounce(async (val: string) => {
    if (!val || val.length < MIN_CHARS) return setSpList([]);
    setSpLoading(true);
    try {
      const list: SP[] = await robustGet(API.serviceProviders, val);
      const filtered = list.filter((x) => (x.companyName ?? "").toLowerCase().includes(val.toLowerCase()));
      setSpList(filtered.slice(0, 50));
    } catch (e) {
      console.error("SP fetch error", e);
      setSpList([]);
    } finally {
      setSpLoading(false);
    }
  }, 250);

  const runFetchCO = debounce(async (val: string) => {
    if (!val || val.length < MIN_CHARS) return setCoList([]);
    setCoLoading(true);
    try {
      const list: CO[] = await robustGet(API.companies, val);
      const filtered = list.filter((x) => (x.companyName ?? "").toLowerCase().includes(val.toLowerCase()));
      setCoList(filtered.slice(0, 50));
    } catch (e) {
      console.error("CO fetch error", e);
      setCoList([]);
    } finally {
      setCoLoading(false);
    }
  }, 250);

  const runFetchBR = debounce(async (val: string) => {
    if (!val || val.length < MIN_CHARS) return setBrList([]);
    setBrLoading(true);
    try {
      const list: BR[] = await robustGet(API.branches, val);
      const filtered = list.filter((x) => (x.branchName ?? "").toLowerCase().includes(val.toLowerCase()));
      setBrList(filtered.slice(0, 50));
    } catch (e) {
      console.error("BR fetch error", e);
      setBrList([]);
    } finally {
      setBrLoading(false);
    }
  }, 250);

  /* ---------------- CRUD ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = mapUiToPayload(formData);
    try {
      if (editingBonus) {
        const res = await fetch(`${API.bonus}/${editingBonus.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated: ApiBonus = await res.json();
        setBonuses((prev) => prev.map((b) => (b.id === String(updated.id) ? mapApiToUi(updated) : b)));
      } else {
        const res = await fetch(API.bonus, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created: ApiBonus = await res.json();
        setBonuses((prev) => [mapApiToUi(created), ...prev]);
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleEdit = (bonus: BonusSetupUI) => {
    setFormData({
      serviceProviderID: bonus.serviceProviderID,
      companyID: bonus.companyID,
      branchesID: bonus.branchesID,
      spAutocomplete: bonus.serviceProvider || "",
      coAutocomplete: bonus.companyName || "",
      brAutocomplete: bonus.branchName || "",
      bonusName: bonus.bonusName,
      description: bonus.description,
      bonusBasedOn: bonus.bonusBasedOn,
      percentageOfBonus: bonus.percentageOfBonus,
    });
    setEditingBonus(bonus);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API.bonus}/${id}`, { method: "DELETE" });
      setBonuses((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceProviderID: null,
      companyID: null,
      branchesID: null,
      spAutocomplete: "",
      coAutocomplete: "",
      brAutocomplete: "",
      bonusName: "",
      description: "",
      bonusBasedOn: "Basic",
      percentageOfBonus: 0,
    });
    setEditingBonus(null);
    setSpList([]); setCoList([]); setBrList([]);
  };

  const filteredBonuses = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return bonuses.filter(
      (b) =>
        b.bonusName.toLowerCase().includes(q) ||
        b.serviceProvider.toLowerCase().includes(q) ||
        b.companyName.toLowerCase().includes(q) ||
        b.branchName.toLowerCase().includes(q),
    );
  }, [bonuses, searchTerm]);

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Bonus Setup</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage bonus configurations and calculations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 text-sm px-3 py-2">
              <Plus className="w-4 h-4 mr-1" />
              Add Bonus Setup
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBonus ? "Edit Bonus Setup" : "Add New Bonus Setup"}</DialogTitle>
              <DialogDescription>
                {editingBonus ? "Update the bonus setup information below." : "Fill in the details to add a new bonus setup."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information WITH AUTOCOMPLETE */}
              <div className="grid grid-cols-3 gap-4">
                {/* Service Provider */}
                <div ref={spRef} className="space-y-2 relative">
                  <Label>Service Provider *</Label>
                  <Input
                    value={formData.spAutocomplete}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({ ...p, spAutocomplete: val, serviceProviderID: null }));
                      runFetchSP(val);
                    }}
                    onFocus={(e) => {
                      const val = e.target.value;
                      if (val.length >= MIN_CHARS) runFetchSP(val);
                    }}
                    placeholder="Start typing service provider…"
                    autoComplete="off"
                    required
                  />
                  {spList.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded w-full shadow max-h-48 overflow-y-auto">
                      {spLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>}
                      {spList.map((sp) => (
                        <div
                          key={sp.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData((p) => ({
                              ...p,
                              serviceProviderID: sp.id,
                              spAutocomplete: sp.companyName ?? "",
                            }));
                            setSpList([]);
                          }}
                        >
                          {sp.companyName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Company */}
                <div ref={coRef} className="space-y-2 relative">
                  <Label>Company *</Label>
                  <Input
                    value={formData.coAutocomplete}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({ ...p, coAutocomplete: val, companyID: null }));
                      runFetchCO(val);
                    }}
                    onFocus={(e) => {
                      const val = e.target.value;
                      if (val.length >= MIN_CHARS) runFetchCO(val);
                    }}
                    placeholder="Start typing company…"
                    autoComplete="off"
                    required
                  />
                  {coList.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded w-full shadow max-h-48 overflow-y-auto">
                      {coLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>}
                      {coList.map((co) => (
                        <div
                          key={co.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData((p) => ({
                              ...p,
                              companyID: co.id,
                              coAutocomplete: co.companyName ?? "",
                            }));
                            setCoList([]);
                          }}
                        >
                          {co.companyName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Branch */}
                <div ref={brRef} className="space-y-2 relative">
                  <Label>Branch *</Label>
                  <Input
                    value={formData.brAutocomplete}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({ ...p, brAutocomplete: val, branchesID: null }));
                      runFetchBR(val);
                    }}
                    onFocus={(e) => {
                      const val = e.target.value;
                      if (val.length >= MIN_CHARS) runFetchBR(val);
                    }}
                    placeholder="Start typing branch…"
                    autoComplete="off"
                    required
                  />
                  {brList.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded w-full shadow max-h-48 overflow-y-auto">
                      {brLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>}
                      {brList.map((br) => (
                        <div
                          key={br.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData((p) => ({
                              ...p,
                              branchesID: br.id,
                              brAutocomplete: br.branchName ?? "",
                            }));
                            setBrList([]);
                          }}
                        >
                          {br.branchName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bonus Name */}
              <div className="space-y-2">
                <Label htmlFor="bonusName">Bonus Name *</Label>
                <Input
                  id="bonusName"
                  value={formData.bonusName}
                  onChange={(e) => setFormData((p) => ({ ...p, bonusName: e.target.value }))}
                  placeholder="Enter bonus name"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Enter bonus description"
                  rows={3}
                  required
                />
              </div>

              {/* Bonus Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Bonus Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bonusBasedOn">Bonus Based On *</Label>
                    <select
                      id="bonusBasedOn"
                      value={formData.bonusBasedOn}
                      onChange={(e) => setFormData((p) => ({ ...p, bonusBasedOn: e.target.value as "Basic" | "Gross" }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Basic">Basic</option>
                      <option value="Gross">Gross</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      Whether bonus is calculated on Basic salary or Gross salary
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentageOfBonus">Percentage of Bonus *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="percentageOfBonus"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.percentageOfBonus}
                        onChange={(e) => setFormData((p) => ({ ...p, percentageOfBonus: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        required
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Percentage of {formData.bonusBasedOn.toLowerCase()} salary for bonus
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingBonus ? "Update Bonus Setup" : "Add Bonus Setup"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & count */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search bonus setups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1 flex-shrink-0">
              {filteredBonuses.length} bonuses
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="mdi:trophy" className="w-5 h-5" />
            Bonus Setup List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 w-full">
          <div className="overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Service Provider</TableHead>
                  <TableHead className="w-[120px]">Company Name</TableHead>
                  <TableHead className="w-[120px]">Branch Name</TableHead>
                  <TableHead className="w-[150px]">Bonus Name</TableHead>
                  <TableHead className="w-[200px]">Description</TableHead>
                  <TableHead className="w-[100px]">Based On</TableHead>
                  <TableHead className="w-[100px]">Percentage</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBonuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="mdi:trophy" className="w-12 h-12 text-gray-300" />
                        <p>No bonus setups found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBonuses.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap">{b.serviceProvider}</TableCell>
                      <TableCell className="whitespace-nowrap">{b.companyName}</TableCell>
                      <TableCell className="whitespace-nowrap">{b.branchName}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{b.bonusName}</TableCell>
                      <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={b.description}>
                        {b.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={b.bonusBasedOn === "Basic" ? "default" : "secondary"}>{b.bonusBasedOn}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center">{b.percentageOfBonus}%</TableCell>
                      <TableCell className="whitespace-nowrap">{b.createdAt}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(b)} className="h-7 w-7 p-0">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(b.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- tiny debounce ---------------- */
function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
