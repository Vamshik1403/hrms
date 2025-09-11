"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Icon } from "@iconify/react"
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react"

interface ServiceProvider {
  id: number
  companyName: string
  companyAddress: string
  country: string
  state: string
  gstNo: string
  contactNo: string
  emailAdd: string
  website: string
  companyLogo: string
  createdAt: string
}

export function ServiceProviderManagement() {
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null)
  const [viewProvider, setViewProvider] = useState<ServiceProvider | null>(null)
  const [formData, setFormData] = useState({
    companyName: "",
    companyAddress: "",
    country: "",
    state: "",
    gstNo: "",
    contactNo: "",
    emailAdd: "",
    website: "",
    companyLogo: "",
  })

  // 🔹 Fetch providers on load
  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const res = await fetch("http://localhost:8000/service-provider")
      const data = await res.json()
      setServiceProviders(data)
    } catch (error) {
      console.error("Error fetching service providers:", error)
    }
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    console.log("Submitting form data:", formData)

    let res
  if (editingProvider) {
  res = await fetch(`http://localhost:8000/service-provider/${editingProvider.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  })
} else {
  res = await fetch("http://localhost:8000/service-provider", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  })
}


    console.log("Response status:", res.status)

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Request failed: ${res.status} - ${errText}`)
    }

    await fetchProviders()
    resetForm()
    setIsDialogOpen(false)
  } catch (error) {
    console.error("Error saving service provider:", error)
  }
}


  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this service provider?")) {
      try {
        await fetch(`http://localhost:8000/service-provider/${id}`, {
          method: "DELETE",
        })
        await fetchProviders()
      } catch (error) {
        console.error("Error deleting service provider:", error)
      }
    }
  }

  const handleEdit = (provider: ServiceProvider) => {
    setFormData({
      companyName: provider.companyName,
      companyAddress: provider.companyAddress,
      country: provider.country,
      state: provider.state,
      gstNo: provider.gstNo,
      contactNo: provider.contactNo,
      emailAdd: provider.emailAdd,
      website: provider.website,
      companyLogo: provider.companyLogo,
    })
    setEditingProvider(provider)
    setIsDialogOpen(true)
  }

  const handleView = (provider: ServiceProvider) => {
    setViewProvider(provider)
    setIsViewDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      companyName: "",
      companyAddress: "",
      country: "",
      state: "",
      gstNo: "",
      contactNo: "",
      emailAdd: "",
      website: "",
      companyLogo: "",
    })
    setEditingProvider(null)
  }

  const filteredProviders = serviceProviders.filter(
    (provider) =>
      provider.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.emailAdd.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.country.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Service Providers</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage your service provider relationships</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 text-sm px-3 py-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Service Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "Edit Service Provider" : "Add New Service Provider"}
              </DialogTitle>
              <DialogDescription>
                {editingProvider
                  ? "Update the service provider information below."
                  : "Fill in the details to add a new service provider."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address *</Label>
                <Textarea
                  id="companyAddress"
                  value={formData.companyAddress}
                  onChange={(e) => setFormData((prev) => ({ ...prev, companyAddress: e.target.value }))}
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">state *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNo">GST No *</Label>
                <Input
                  id="gstNo"
                  value={formData.gstNo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gstNo: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactNo">Contact Number *</Label>
                  <Input
                    id="contactNo"
                    value={formData.contactNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactNo: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailAdd">Email Address *</Label>
                  <Input
                    id="emailAdd"
                    type="email"
                    value={formData.emailAdd}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emailAdd: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingProvider ? "Update Provider" : "Add Provider"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Provider Details</DialogTitle>
            <DialogDescription>All information is read-only.</DialogDescription>
          </DialogHeader>
          {viewProvider && (
            <div className="space-y-3">
              <p><strong>Company:</strong> {viewProvider.companyName}</p>
              <p><strong>Address:</strong> {viewProvider.companyAddress}</p>
              <p><strong>Country:</strong> {viewProvider.country}</p>
              <p><strong>State:</strong> {viewProvider.state}</p>
              <p><strong>GST No:</strong> {viewProvider.gstNo}</p>
              <p><strong>Contact:</strong> {viewProvider.contactNo}</p>
              <p><strong>Email:</strong> {viewProvider.emailAdd}</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search service providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1 flex-shrink-0">
              {filteredProviders.length} providers
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="mdi:account-group" className="w-5 h-5" />
            Service Providers List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 w-full">
          <div className="overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>state</TableHead>
                  <TableHead>GST No</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="mdi:account-search" className="w-12 h-12 text-gray-300" />
                        <p>No service providers found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProviders.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>{provider.companyName}</TableCell>
                      <TableCell>{provider.companyAddress}</TableCell>
                      <TableCell>{provider.country}</TableCell>
                      <TableCell>{provider.state}</TableCell>
                      <TableCell>{provider.gstNo}</TableCell>
                      <TableCell>{provider.contactNo}</TableCell>
                      <TableCell>{provider.emailAdd}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(provider)}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(provider)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(provider.id)}
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
  )
}
