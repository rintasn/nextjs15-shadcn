"use client"

import { useEffect, useState, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
Breadcrumb,
BreadcrumbItem,
BreadcrumbLink,
BreadcrumbList,
BreadcrumbPage,
BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
SidebarInset,
SidebarProvider,
SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { 
CalendarIcon, 
RefreshCw, 
FileEdit, 
Upload,
CheckCircle 
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import useSWR from "swr"
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AndonTicket {
id_andon_security: number
created_at: string
id_ticket: number
department: string
pic_security: string
updated_at: string
evidence_updated: string
evidence_uploaded: string
status_ticket: number
}

// Update form interface
interface UpdateTicketForm {
id_ticket: number
department: string
pic_security: string
status_ticket: number
evidence_file?: File | null
}

// Update data interface
interface TicketUpdateData {
id_ticket: number
department: string
pic_security: string
updated_at: string
status_ticket: number
evidence_uploaded?: string
evidence_updated?: string
}

export default function Page() {
// Get first day of current month and last day of next month for default values
const today = new Date()
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

// Calculate the last day of next month
// By setting day to 0, we get the last day of the previous month
const lastDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)

// State for date filters
const [startDate, setStartDate] = useState(format(firstDayOfMonth, "yyyy-MM-dd"))
const [endDate, setEndDate] = useState(format(lastDayOfNextMonth, "yyyy-MM-dd"))

// State for alarm
const [hasOpenTickets, setHasOpenTickets] = useState(false)
const [isAlarmPlaying, setIsAlarmPlaying] = useState(false)
const alarmRef = useRef<HTMLAudioElement>(null)

// State for update dialog
const [dialogOpen, setDialogOpen] = useState(false)
const [selectedTicket, setSelectedTicket] = useState<AndonTicket | null>(null)
const [formData, setFormData] = useState<UpdateTicketForm>({
  id_ticket: 0,
  department: "",
  pic_security: "",
  status_ticket: 0,
  evidence_file: null
})
const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState("")
const [submitSuccess, setSubmitSuccess] = useState(false)

// Create a fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error("Failed to fetch data")
  }
  return response.json()
}

// Function to play alarm
const playAlarm = () => {
  if (alarmRef.current) {
    alarmRef.current.volume = 1.0;
    alarmRef.current.loop = true;
    alarmRef.current.play()
      .then(() => {
        setIsAlarmPlaying(true);
      })
      .catch((error) => {
        console.error("Error playing alarm:", error);
      });
  }
}

// Function to stop alarm
const stopAlarm = () => {
  if (alarmRef.current) {
    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;
    setIsAlarmPlaying(false);
  }
}

// Use SWR for data fetching with automatic revalidation
const { data, error, isLoading, isValidating, mutate } = useSWR(
  `https://portal2.incoe.astra.co.id:3008/get-andon-security?start_date=${startDate}&end_date=${endDate}&status=0`,
  fetcher,
  {
    refreshInterval: 10000, // Refresh every 10 seconds
    revalidateOnFocus: true, // Refresh when window regains focus
    revalidateOnReconnect: true, // Refresh when browser regains connection
    dedupingInterval: 5000, // Deduplicate requests within 5 seconds
  }
)

// Extract tickets from data
const tickets: AndonTicket[] = data?.results || []

// Function to manually refresh data
const refreshData = () => {
  mutate()
}

// Function to open dialog with ticket data
const openEditDialog = (ticket: AndonTicket) => {
  setSelectedTicket(ticket)
  setFormData({
    id_ticket: ticket.id_ticket,
    department: ticket.department,
    pic_security: ticket.pic_security || "",
    status_ticket: ticket.status_ticket,
    evidence_file: null
  })
  setSubmitError("")
  setSubmitSuccess(false)
  setDialogOpen(true)
}

// Handle form field changes
const handleFormChange = (field: keyof UpdateTicketForm, value: any) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }))
}

// Handle file input
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    setFormData(prev => ({
      ...prev,
      evidence_file: e.target.files![0]
    }))
  }
}

// Submit updated ticket data with file upload
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setSubmitError("");
  setSubmitSuccess(false);
  
  try {
    // Get current timestamp
    const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    
    // Create FormData for combined data and file upload
    const uploadData = new FormData();
    
    // Add ticket data fields
    uploadData.append("id_ticket", formData.id_ticket.toString());
    uploadData.append("department", formData.department);
    uploadData.append("pic_security", formData.pic_security);
    uploadData.append("status_ticket", formData.status_ticket.toString());
    uploadData.append("updated_at", now);
    
    // Add evidence file if selected
    if (formData.evidence_file) {
      uploadData.append("evidence_file", formData.evidence_file);
      uploadData.append("evidence_updated", now);
    } else if (selectedTicket?.evidence_uploaded) {
      // Preserve existing evidence path if no new file is uploaded
      uploadData.append("evidence_uploaded", selectedTicket.evidence_uploaded);
      uploadData.append("evidence_updated", selectedTicket.evidence_updated || now);
    }
    
    // Log FormData content for debugging (optional)
    console.log("Submitting with data:", {
      id_ticket: formData.id_ticket,
      department: formData.department,
      pic_security: formData.pic_security,
      status_ticket: formData.status_ticket,
      hasFile: !!formData.evidence_file
    });
    
    // Send combined update request with FormData
    const response = await fetch("https://portal2.incoe.astra.co.id:3008/update-andon-security", {
      method: "POST",
      body: uploadData
      // Don't set Content-Type header - browser will set it with correct boundary for multipart/form-data
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update ticket");
    }
    
    // Parse the response
    const result = await response.json();
    
    // Success - refresh data
    console.log("Update successful:", result);
    setSubmitSuccess(true);
    setTimeout(() => {
      setDialogOpen(false);
      setSelectedTicket(null);
      mutate(); // Refresh data using SWR
    }, 1500);
    
  } catch (error) {
    console.error("Error updating ticket:", error);
    setSubmitError(error instanceof Error ? error.message : "Failed to update the ticket. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
}

// Calculate summary
const openTickets = tickets.filter(ticket => ticket.status_ticket === 0).length
const processTickets = tickets.filter(ticket => ticket.status_ticket === 1).length
const closedTickets = tickets.filter(ticket => ticket.status_ticket === 2).length

// Check for open tickets and handle alarm when data changes
useEffect(() => {
  if (tickets && tickets.length > 0) {
    const hasOpen = tickets.some(ticket => ticket.status_ticket === 0)
    setHasOpenTickets(hasOpen)
    
    // Automatically play alarm if there are open tickets
    if (hasOpen && !isAlarmPlaying) {
      playAlarm()
    }
    // If no open tickets and alarm is playing, stop it
    else if (!hasOpen && isAlarmPlaying) {
      stopAlarm()
    }
  }
}, [tickets, isAlarmPlaying])

// Format date for display
const formatDate = (dateString: string) => {
  if (dateString === "0000-00-00 00:00:00") return "-"
  try {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: id })
  } catch (e) {
    return dateString
  }
}

// Get status badge class and text
const getStatusInfo = (status: number) => {
  switch (status) {
    case 0:
      return { 
        class: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium", 
        text: "Open" 
      }
    case 1:
      return { 
        class: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium", 
        text: "Process" 
      }
    case 2:
      return { 
        class: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium", 
        text: "Closed" 
      }
    default:
      return { 
        class: "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium", 
        text: "Unknown" 
      }
  }
}

return (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      {/* Hidden audio element for alarm */}
      <audio 
        ref={alarmRef} 
        src="/assets/sound/alarm.wav" 
        preload="auto"
      />
      
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/home">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Andon Security</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Date filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-auto">
                <div className="text-sm font-medium mb-2">Start Date</div>
                <div className="flex">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-auto">
                <div className="text-sm font-medium mb-2">End Date</div>
                <div className="flex">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <Button 
                onClick={refreshData} 
                disabled={isValidating}
                className="w-full md:w-auto flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 mt-2 flex items-center">
              <div className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isValidating ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                {isValidating 
                  ? "Refreshing data..." 
                  : `Last updated: ${new Date().toLocaleTimeString()}`
                }
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Auto-refreshes every 10 seconds
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={`${hasOpenTickets ? 'animate-pulse' : ''} bg-red-50`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-900">Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">{openTickets}</div>
              <p className="text-xs text-red-800 mt-1">Requiring immediate attention</p>
              {hasOpenTickets && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="mt-2" 
                  onClick={isAlarmPlaying ? stopAlarm : playAlarm}
                >
                  {isAlarmPlaying ? "Stop Alarm" : "Trigger Alarm Manually"}
                </Button>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-900">In Process</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">{processTickets}</div>
              <p className="text-xs text-yellow-800 mt-1">Currently being handled</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{closedTickets}</div>
              <p className="text-xs text-green-800 mt-1">Successfully resolved</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Data table */}
        <Card>
          <CardHeader>
            <CardTitle>Andon Security Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>PIC Security</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      {isLoading ? "Loading data..." : "No tickets found for selected period"}
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.id_andon_security}>
                      <TableCell>{ticket.id_ticket}</TableCell>
                      <TableCell>{formatDate(ticket.created_at)}</TableCell>
                      <TableCell>{ticket.department}</TableCell>
                      <TableCell>{ticket.pic_security || "-"}</TableCell>
                      <TableCell>
                        <span className={getStatusInfo(ticket.status_ticket).class}>
                          {getStatusInfo(ticket.status_ticket).text}
                        </span>
                      </TableCell>
                      <TableCell>
                        {ticket.updated_at !== "0000-00-00 00:00:00" 
                          ? formatDate(ticket.updated_at) 
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(ticket)}
                          className="flex items-center gap-1"
                        >
                          <FileEdit className="h-3 w-3" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
    
    {/* Update Ticket Dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Ticket #{selectedTicket?.id_ticket}</DialogTitle>
          <DialogDescription>
            Update ticket status and upload evidence.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="grid gap-4 py-4">
            {submitSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-md">
                <CheckCircle className="h-5 w-5" />
                <p>Ticket updated successfully!</p>
              </div>
            )}
            
            {submitError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-md">
                {submitError}
              </div>
            )}
          
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="id_ticket" className="text-right">
                Ticket ID
              </Label>
              <Input
                id="id_ticket"
                value={formData.id_ticket}
                className="col-span-3"
                readOnly
                disabled
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Department
              </Label>
              <Input
                id="department"
                value={formData.department}
                className="col-span-3"
                readOnly
                disabled
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pic_security" className="text-right">
                PIC Security
              </Label>
              <Input
                id="pic_security"
                value={formData.pic_security}
                onChange={(e) => handleFormChange('pic_security', e.target.value)}
                className="col-span-3"
                placeholder="Enter security personnel name"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                value={formData.status_ticket.toString()} 
                onValueChange={(value) => handleFormChange('status_ticket', Number(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Open</SelectItem>
                  <SelectItem value="1">In Process</SelectItem>
                  <SelectItem value="2">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="evidence" className="text-right">
                Evidence
              </Label>
              <div className="col-span-3">
                <Input
                  id="evidence"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/jpg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload JPG, JPEG or PNG file. File will be saved to /public/evidence_andon_security/
                </p>
                {formData.evidence_file && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {formData.evidence_file.name}
                  </p>
                )}
              </div>
            </div>
            
            {selectedTicket?.evidence_uploaded && selectedTicket.evidence_uploaded !== "" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Current Evidence
                </Label>
                <div className="col-span-3">
                  <a
                    href={`https://portal2.incoe.astra.co.id:3008/${selectedTicket.evidence_uploaded}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    View current evidence
                  </a>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </SidebarProvider>
)
}