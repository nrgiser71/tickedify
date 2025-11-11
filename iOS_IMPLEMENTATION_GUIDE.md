# Tickedify iOS App Implementation Guide

**Document Version**: 1.0  
**Last Updated**: November 10, 2025  
**API Version**: 1.0.15  
**Target**: Native iOS App (Swift/SwiftUI)

---

## Overview

This guide provides iOS developers with everything needed to build a native Tickedify client. The API is REST-based with session-based authentication and uses PostgreSQL with 285 documented endpoints.

---

## Quick Start

### 1. Authentication Flow

```swift
import Foundation

class TickedifyAuthManager: NSObject, URLSessionDelegate {
    let baseURL = "https://tickedify.com/api"
    let session: URLSession
    
    override init() {
        let config = URLSessionConfiguration.default
        config.httpShouldSetCookies = true
        config.httpCookieAcceptPolicy = .always
        config.httpShouldCookieStore = true
        config.httpCookieStorage = HTTPCookieStorage.shared
        self.session = URLSession(configuration: config)
        super.init()
    }
    
    // MARK: - Registration
    func register(email: String, name: String, password: String) async throws -> RegistrationResponse {
        let url = URL(string: "\(baseURL)/auth/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "email": email,
            "naam": name,
            "wachtwoord": password
        ]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "Invalid response", code: -1)
        }
        
        if httpResponse.statusCode == 409 {
            throw TickedifyError.emailAlreadyExists
        } else if httpResponse.statusCode == 400 {
            let errorResponse = try JSONDecoder().decode(RegistrationError.self, from: data)
            throw TickedifyError.passwordTooWeak(errorResponse.passwordErrors ?? [])
        }
        
        return try JSONDecoder().decode(RegistrationResponse.self, from: data)
    }
    
    // MARK: - Login
    func login(email: String, password: String) async throws -> LoginResponse {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "email": email,
            "wachtwoord": password
        ]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw TickedifyError.invalidCredentials
        }
        
        return try JSONDecoder().decode(LoginResponse.self, from: data)
    }
    
    // MARK: - Get Current User
    func getCurrentUser() async throws -> CurrentUserResponse {
        let url = URL(string: "\(baseURL)/auth/me")!
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "Invalid response", code: -1)
        }
        
        if httpResponse.statusCode == 401 {
            throw TickedifyError.notAuthenticated
        }
        
        return try JSONDecoder().decode(CurrentUserResponse.self, from: data)
    }
    
    // MARK: - Logout
    func logout() async throws {
        let url = URL(string: "\(baseURL)/auth/logout")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "Logout failed", code: -1)
        }
    }
}

// MARK: - Data Models
struct RegistrationResponse: Codable {
    let success: Bool
    let message: String
    let redirect: String
    let user: User
}

struct RegistrationError: Codable {
    let success: Bool
    let error: String
    let passwordErrors: [String]?
}

struct LoginResponse: Codable {
    let success: Bool
    let message: String
    let user: User
    let requiresUpgrade: Bool?
    let expiryType: String?
}

struct CurrentUserResponse: Codable {
    let authenticated: Bool
    let hasAccess: Bool
    let requiresUpgrade: Bool
    let expiryType: String?
    let accessMessage: String?
    let user: User
    let betaConfig: BetaConfig
}

struct User: Codable {
    let id: String
    let email: String
    let naam: String
    let rol: String?
    let accountType: String?
    let subscriptionStatus: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case naam
        case rol
        case accountType = "account_type"
        case subscriptionStatus = "subscription_status"
    }
}

struct BetaConfig: Codable {
    let betaPeriodActive: Bool
    let betaEndedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case betaPeriodActive = "beta_period_active"
        case betaEndedAt = "beta_ended_at"
    }
}

enum TickedifyError: Error {
    case emailAlreadyExists
    case passwordTooWeak([String])
    case invalidCredentials
    case notAuthenticated
    case networkError(String)
}
```

---

### 2. Task Management

```swift
class TickedifyTaskManager {
    let authManager: TickedifyAuthManager
    let baseURL = "https://tickedify.com/api"
    
    init(authManager: TickedifyAuthManager) {
        self.authManager = authManager
    }
    
    // MARK: - Create Task
    func createTask(
        titel: String,
        project: String? = nil,
        context: String? = nil,
        duur: Int? = nil,
        prioriteit: String = "gemiddeld"
    ) async throws -> Task {
        let url = URL(string: "\(baseURL)/taak/add-to-inbox")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "titel": titel,
            "project": project as Any,
            "context": context as Any,
            "duur": duur as Any,
            "prioriteit": prioriteit
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await authManager.session.data(for: request)
        
        return try JSONDecoder().decode(Task.self, from: data)
    }
    
    // MARK: - Get Task
    func getTask(id: String) async throws -> Task {
        let url = URL(string: "\(baseURL)/taak/\(id)")!
        let (data, _) = try await authManager.session.data(from: url)
        return try JSONDecoder().decode(Task.self, from: data)
    }
    
    // MARK: - Update Task
    func updateTask(id: String, updates: [String: Any]) async throws -> Task {
        let url = URL(string: "\(baseURL)/taak/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: updates)
        
        let (data, _) = try await authManager.session.data(for: request)
        return try JSONDecoder().decode(Task.self, from: data)
    }
    
    // MARK: - Delete Task
    func deleteTask(id: String, permanently: Bool = false) async throws {
        let url = URL(string: "\(baseURL)/taak/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["permanently": permanently]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await authManager.session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "Delete failed", code: -1)
        }
    }
    
    // MARK: - Mark Task Complete (triggers recurring)
    func completeTask(id: String) async throws -> Task {
        var updates: [String: Any] = ["afgerond": true]
        return try await updateTask(id: id, updates: updates)
    }
    
    // MARK: - Set Task Priority
    func setPriority(taskId: String, prioriteit: String) async throws {
        let url = URL(string: "\(baseURL)/taak/\(taskId)/prioriteit")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["prioriteit": prioriteit]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await authManager.session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "Priority update failed", code: -1)
        }
    }
}

// MARK: - Task Model
struct Task: Codable, Identifiable {
    let id: String
    let titel: String
    let beschrijving: String?
    let project: String?
    let context: String?
    let prioriteit: String
    let duur: Int?
    let verschijndatum: String?
    let afgerond: Bool?
    let archived: Bool?
    let herhaling_type: String?
    let herhaling_actief: Bool?
    let lijst: String?
    let aangemaakt: String?
    let gewijzigd: String?
    let bijlagen: [Attachment]?
    let subtaken: [Subtask]?
    
    enum CodingKeys: String, CodingKey {
        case id, titel, beschrijving, project, context, prioriteit, duur, verschijndatum
        case afgerond, archived, lijst, aangemaakt, gewijzigd, bijlagen, subtaken
        case herhaling_type, herhaling_actief
    }
}

struct Attachment: Codable, Identifiable {
    let id: String
    let filename: String
    let size: Int
    let created_at: String
}

struct Subtask: Codable, Identifiable {
    let id: String
    let titel: String
    let afgerond: Bool
    let volgorde: Int
}
```

---

### 3. List Management

```swift
class TickedifyListManager {
    let authManager: TickedifyAuthManager
    let baseURL = "https://tickedify.com/api"
    
    init(authManager: TickedifyAuthManager) {
        self.authManager = authManager
    }
    
    // MARK: - Get All Lists with Counts
    func getListsWithCounts() async throws -> ListsResponse {
        let url = URL(string: "\(baseURL)/lijsten")!
        let (data, _) = try await authManager.session.data(from: url)
        return try JSONDecoder().decode(ListsResponse.self, from: data)
    }
    
    // MARK: - Get Tasks in List
    func getList(naam: String) async throws -> ListResponse {
        let url = URL(string: "\(baseURL)/lijst/\(naam)")!
        let (data, _) = try await authManager.session.data(from: url)
        return try JSONDecoder().decode(ListResponse.self, from: data)
    }
    
    // MARK: - Reorder Tasks in List
    func saveListOrder(naam: String, tasks: [TaskOrder]) async throws {
        let url = URL(string: "\(baseURL)/lijst/\(naam)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(tasks)
        
        let (_, response) = try await authManager.session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "Save failed", code: -1)
        }
    }
    
    // MARK: - Get Sidebar Counts
    func getSidebarCounts() async throws -> SidebarCounts {
        let url = URL(string: "\(baseURL)/counts/sidebar")!
        let (data, _) = try await authManager.session.data(from: url)
        return try JSONDecoder().decode(SidebarCounts.self, from: data)
    }
}

// MARK: - List Models
struct ListsResponse: Codable {
    let lijsten: [ListInfo]
    let custom_lists: [ListInfo]?
}

struct ListInfo: Codable {
    let naam: String
    let display_name: String?
    let count: Int
    let icon: String?
    let type: String
}

struct ListResponse: Codable {
    let naam: String
    let tasks: [Task]
    let total: Int
}

struct TaskOrder: Codable {
    let id: String
    let titel: String
    let volgorde: Int
}

struct SidebarCounts: Codable {
    let counts: [String: Int]
    let overdue: Int?
    let today: Int?
    let this_week: Int?
}
```

---

### 4. Daily Planning

```swift
class TickedifyPlanningManager {
    let authManager: TickedifyAuthManager
    let baseURL = "https://tickedify.com/api"
    
    init(authManager: TickedifyAuthManager) {
        self.authManager = authManager
    }
    
    // MARK: - Get Daily Plan
    func getDailyPlan(datum: String) async throws -> DailyPlanResponse {
        let encodedDate = datum.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? datum
        let url = URL(string: "\(baseURL)/dagelijkse-planning/\(encodedDate)")!
        let (data, _) = try await authManager.session.data(from: url)
        return try JSONDecoder().decode(DailyPlanResponse.self, from: data)
    }
    
    // MARK: - Add Task to Daily Plan
    func scheduleTask(datum: String, taskId: String, volgorde: Int) async throws -> PlanningResponse {
        let url = URL(string: "\(baseURL)/dagelijkse-planning")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "datum": datum,
            "taak_id": taskId,
            "volgorde": volgorde
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await authManager.session.data(for: request)
        return try JSONDecoder().decode(PlanningResponse.self, from: data)
    }
    
    // MARK: - Update Planning Entry
    func updatePlanning(id: String, updates: [String: Any]) async throws {
        let url = URL(string: "\(baseURL)/dagelijkse-planning/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: updates)
        
        let (_, response) = try await authManager.session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "Update failed", code: -1)
        }
    }
    
    // MARK: - Remove from Daily Plan
    func removePlanning(id: String) async throws {
        let url = URL(string: "\(baseURL)/dagelijkse-planning/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        let (_, response) = try await authManager.session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "Delete failed", code: -1)
        }
    }
}

// MARK: - Planning Models
struct DailyPlanResponse: Codable {
    let datum: String
    let planned_tasks: [PlannedTask]
    let total_minutes: Int
    let total_tasks: Int
    let date_info: DateInfo
}

struct PlannedTask: Codable {
    let id: String
    let taak_id: String
    let titel: String
    let project: String?
    let context: String?
    let prioriteit: String
    let duur: Int?
    let afgerond: Bool
    let volgorde: Int
    let geplande_uren: String?
}

struct DateInfo: Codable {
    let day_of_week: String
    let is_weekend: Bool
    let is_holiday: Bool
}

struct PlanningResponse: Codable {
    let success: Bool
    let id: String
    let message: String
}
```

---

### 5. Email Import

```swift
class TickedifyEmailManager {
    let authManager: TickedifyAuthManager
    let baseURL = "https://tickedify.com/api"
    
    init(authManager: TickedifyAuthManager) {
        self.authManager = authManager
    }
    
    // MARK: - Get Import Code
    func getImportCode() async throws -> ImportCodeResponse {
        let url = URL(string: "\(baseURL)/user/email-import-code")!
        let (data, _) = try await authManager.session.data(from: url)
        return try JSONDecoder().decode(ImportCodeResponse.self, from: data)
    }
    
    // MARK: - Regenerate Import Code
    func regenerateImportCode() async throws -> ImportCodeResponse {
        let url = URL(string: "\(baseURL)/user/regenerate-import-code")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (data, _) = try await authManager.session.data(for: request)
        return try JSONDecoder().decode(ImportCodeResponse.self, from: data)
    }
}

// MARK: - Email Import Models
struct ImportCodeResponse: Codable {
    let success: Bool
    let importCode: String
    let importEmail: String
    let message: String?
}

// Email Syntax Builder (helper for creating email-formatted tasks)
struct EmailTaskBuilder {
    var project: String?
    var context: String?
    var dueDate: String?  // YYYY-MM-DD
    var duration: Int?
    var priority: Int = 2  // 0-2: high, 2: medium, 3+: low
    var deferType: DeferType?
    var description: String = ""
    
    enum DeferType: String {
        case followUp = "df"
        case weekly = "dw"
        case monthly = "dm"
        case quarterly = "d3m"
        case biAnnual = "d6m"
        case yearly = "dy"
    }
    
    func buildEmailBody() -> String {
        var parts: [String] = []
        
        if let project = project {
            parts.append("p: \(project)")
        }
        if let context = context {
            parts.append("c: \(context)")
        }
        if let dueDate = dueDate {
            parts.append("d: \(dueDate)")
        }
        if let duration = duration {
            parts.append("t: \(duration)")
        }
        if priority < 3 {
            parts.append("p\(priority)")
        }
        if let deferType = deferType {
            parts.append("\(deferType.rawValue);")
        }
        
        var header = ""
        if !parts.isEmpty {
            header = "@t " + parts.joined(separator: "; ") + ";\n\n"
        }
        
        return header + description + "\n\n--END--"
    }
}
```

---

### 6. File Attachments

```swift
class TickedifyAttachmentManager {
    let authManager: TickedifyAuthManager
    let baseURL = "https://tickedify.com/api"
    
    init(authManager: TickedifyAuthManager) {
        self.authManager = authManager
    }
    
    // MARK: - Upload File
    func uploadFile(
        taskId: String,
        fileName: String,
        fileData: Data,
        mimeType: String
    ) async throws -> AttachmentResponse {
        let url = URL(string: "\(baseURL)/taak/\(taskId)/bijlagen")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let boundary = UUID().uuidString
        let contentType = "multipart/form-data; boundary=\(boundary)"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add file field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n".data(using: .utf8)!)
        
        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (data, _) = try await authManager.session.data(for: request)
        return try JSONDecoder().decode(AttachmentResponse.self, from: data)
    }
    
    // MARK: - Get Task Attachments
    func getAttachments(taskId: String) async throws -> AttachmentsListResponse {
        let url = URL(string: "\(baseURL)/taak/\(taskId)/bijlagen")!
        let (data, _) = try await authManager.session.data(from: url)
        return try JSONDecoder().decode(AttachmentsListResponse.self, from: data)
    }
    
    // MARK: - Download File
    func downloadAttachment(attachmentId: String) async throws -> Data {
        let url = URL(string: "\(baseURL)/bijlage/\(attachmentId)/download")!
        let (data, _) = try await authManager.session.data(from: url)
        return data
    }
    
    // MARK: - Get Preview (Thumbnail)
    func getPreview(attachmentId: String, size: Int = 200) async throws -> Data {
        let url = URL(string: "\(baseURL)/bijlage/\(attachmentId)/preview?size=\(size)x\(size)")!
        let (data, _) = try await authManager.session.data(from: url)
        return data
    }
    
    // MARK: - Delete Attachment
    func deleteAttachment(attachmentId: String) async throws {
        let url = URL(string: "\(baseURL)/bijlage/\(attachmentId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        let (_, response) = try await authManager.session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "Delete failed", code: -1)
        }
    }
}

// MARK: - Attachment Models
struct AttachmentResponse: Codable {
    let success: Bool
    let attachment: AttachmentInfo
}

struct AttachmentInfo: Codable, Identifiable {
    let id: String
    let taak_id: String
    let filename: String
    let mimetype: String
    let size: Int
    let created_at: String
    let download_url: String
}

struct AttachmentsListResponse: Codable {
    let task_id: String
    let attachments: [AttachmentInfo]
}
```

---

### 7. Recurring Tasks

```swift
class TickedifyRecurringManager {
    let authManager: TickedifyAuthManager
    let baseURL = "https://tickedify.com/api"
    
    init(authManager: TickedifyAuthManager) {
        self.authManager = authManager
    }
    
    // MARK: - Set Recurring Pattern
    func setRecurring(
        taskId: String,
        pattern: RecurringPattern,
        baseDate: String
    ) async throws -> RecurringResponse {
        let url = URL(string: "\(baseURL)/taak/recurring")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "taskId": taskId,
            "recurringType": pattern.rawValue,
            "baseDate": baseDate
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await authManager.session.data(for: request)
        return try JSONDecoder().decode(RecurringResponse.self, from: data)
    }
}

// MARK: - Recurring Models
enum RecurringPattern: String, CaseIterable {
    case daily = "dagelijks"
    case daily2 = "daily-2"
    case daily3 = "daily-3"
    case daily7 = "daily-7"
    case workdays = "werkdagen"
    case weeklyMWF = "weekly-1-1,3,5"
    case weeklyTTh = "weekly-1-2,4"
    case biweekly = "weekly-2-1,3,5"
    case monthlyDay15 = "monthly-day-15-1"
    case monthlyFirstMonday = "monthly-weekday-first-1-1"
    case monthlyLastFriday = "monthly-weekday-last-5-1"
    case yearly = "yearly-1-1-1"
    
    var displayName: String {
        switch self {
        case .daily: return "Daily"
        case .daily2: return "Every 2 days"
        case .daily3: return "Every 3 days"
        case .daily7: return "Every 7 days"
        case .workdays: return "Weekdays (Mon-Fri)"
        case .weeklyMWF: return "Weekly (Mon, Wed, Fri)"
        case .weeklyTTh: return "Weekly (Tue, Thu)"
        case .biweekly: return "Bi-weekly"
        case .monthlyDay15: return "Monthly on 15th"
        case .monthlyFirstMonday: return "First Monday of month"
        case .monthlyLastFriday: return "Last Friday of month"
        case .yearly: return "Yearly"
        }
    }
}

struct RecurringResponse: Codable {
    let success: Bool
    let message: String
    let task: RecurringTaskInfo
}

struct RecurringTaskInfo: Codable {
    let id: String
    let herhaling_type: String
    let herhaling_actief: Bool
    let next_occurrence: String?
}
```

---

## Network Configuration

### URLSession Setup
```swift
let config = URLSessionConfiguration.default
config.httpShouldSetCookies = true
config.httpCookieAcceptPolicy = .always
config.httpShouldCookieStore = true
config.httpCookieStorage = HTTPCookieStorage.shared
config.waitsForConnectivity = true
config.timeoutIntervalForRequest = 30
config.timeoutIntervalForResource = 300
config.requestCachePolicy = .useProtocolCachePolicy

let session = URLSession(configuration: config)
```

### SSL Pinning (Recommended for Production)
```swift
class CertificatePinningDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Validate certificate
        var secResult = SecTrustResultType.invalid
        let status = SecTrustEvaluate(serverTrust, &secResult)
        
        if status == errSecSuccess {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

---

## Date Handling

```swift
class DateHelper {
    static let iso8601DateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    static let dateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()
    
    static func formatDateOnly(_ date: Date) -> String {
        return dateOnlyFormatter.string(from: date)
    }
    
    static func parseDateOnly(_ dateString: String) -> Date? {
        return dateOnlyFormatter.date(from: dateString)
    }
    
    static func formatISO8601(_ date: Date) -> String {
        return iso8601DateFormatter.string(from: date)
    }
    
    static func parseISO8601(_ dateString: String) -> Date? {
        return iso8601DateFormatter.date(from: dateString)
    }
}
```

---

## Error Handling

```swift
enum TickedifyAPIError: LocalizedError {
    case badURL
    case decodingError
    case serverError(Int)
    case networkError(URLError)
    case businessLogicError(String)
    
    var errorDescription: String? {
        switch self {
        case .badURL:
            return "Invalid URL"
        case .decodingError:
            return "Failed to decode response"
        case .serverError(let code):
            return "Server error: \(code)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .businessLogicError(let message):
            return message
        }
    }
}

func handleAPIError(_ error: Error) -> TickedifyAPIError {
    if let urlError = error as? URLError {
        return .networkError(urlError)
    }
    
    if error is DecodingError {
        return .decodingError
    }
    
    return .businessLogicError(error.localizedDescription)
}
```

---

## Performance Tips

### 1. Caching
```swift
// Cache list counts for 5 minutes
class CacheManager {
    private static let cache = NSCache<NSString, AnyObject>()
    
    static func getCached<T>(forKey key: String) -> T? {
        return cache.object(forKey: key as NSString) as? T
    }
    
    static func setCached<T>(_ value: T, forKey key: String) {
        cache.setObject(value as AnyObject, forKey: key as NSString)
    }
    
    static func clearCache() {
        cache.removeAllObjects()
    }
}
```

### 2. Batch Operations
```swift
// Delete multiple tasks at once
func deleteMultipleTasks(_ taskIds: [String]) async throws {
    let url = URL(string: "\(baseURL)/bulk/soft-delete")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = ["taskIds": taskIds]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    
    let (_, response) = try await session.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
        throw NSError(domain: "Batch delete failed", code: -1)
    }
}
```

### 3. Pagination
```swift
func getTasksPage(page: Int = 1, limit: Int = 50) async throws -> [Task] {
    let url = URL(string: "\(baseURL)/lijst/acties?page=\(page)&limit=\(limit)")!
    let (data, _) = try await session.data(from: url)
    return try JSONDecoder().decode([Task].self, from: data)
}
```

---

## Offline Support

```swift
class OfflineQueue {
    private var queue: [OfflineOperation] = []
    
    struct OfflineOperation: Codable {
        let id: String
        let operation: String  // "create", "update", "delete"
        let endpoint: String
        let payload: [String: AnyCodable]
        let timestamp: Date
    }
    
    func queueOperation(_ op: OfflineOperation) {
        queue.append(op)
        saveQueue()
    }
    
    func processPendingOperations() async throws {
        for operation in queue {
            try await processOperation(operation)
            queue.removeAll { $0.id == operation.id }
        }
        saveQueue()
    }
}
```

---

## Testing

```swift
import XCTest

class TickedifyAPITests: XCTestCase {
    var authManager: TickedifyAuthManager!
    
    override func setUp() {
        super.setUp()
        authManager = TickedifyAuthManager()
    }
    
    func testRegistration() async throws {
        let response = try await authManager.register(
            email: "test@example.com",
            name: "Test User",
            password: "Test123!@#"
        )
        XCTAssertTrue(response.success)
    }
    
    func testLogin() async throws {
        let response = try await authManager.login(
            email: "test@example.com",
            password: "Test123!@#"
        )
        XCTAssertTrue(response.success)
    }
    
    func testTaskCreation() async throws {
        let taskManager = TickedifyTaskManager(authManager: authManager)
        let task = try await taskManager.createTask(titel: "Test Task")
        XCTAssertNotNil(task.id)
    }
}
```

---

## API Endpoints Summary by Category

### Essential Endpoints
- **POST /api/auth/register** - Create account
- **POST /api/auth/login** - Login
- **GET /api/auth/me** - Current user info
- **POST /api/auth/logout** - Logout
- **POST /api/taak/add-to-inbox** - Create task
- **GET /api/taak/:id** - Get task
- **PUT /api/taak/:id** - Update task
- **DELETE /api/taak/:id** - Delete task
- **GET /api/lijst/:naam** - Get list
- **GET /api/dagelijkse-planning/:datum** - Get daily plan
- **POST /api/dagelijkse-planning** - Schedule task

### Less Common But Useful
- **PUT /api/taak/:id/prioriteit** - Change priority
- **POST /api/taak/recurring** - Set recurrence
- **POST /api/taak/:id/bijlagen** - Upload file
- **GET /api/bijlage/:id/download** - Download file
- **GET /api/user/email-import-code** - Get email import code
- **GET /api/counts/sidebar** - Get all counts for UI

---

## Compliance & Security Notes

### Session Handling
- HTTPOnly cookies are used
- Secure flag is set in production
- Sessions persist across requests
- Automatic cookie management by URLSession

### Password Security
- Minimum 8 characters
- Must contain: uppercase, lowercase, numbers, special chars
- Hashed with bcrypt (salt rounds: 10)
- Never transmitted in plaintext

### API Security
- All endpoints over HTTPS only
- Session validation on every request
- Rate limiting recommended
- CORS configured for single domain
- No API keys in client code

### Data Privacy
- PII not logged
- User data isolated per user
- Soft deletes for audit trail
- File encryption at rest (B2 storage)

---

## Support & Documentation

- **API Docs**: See API_DOCUMENTATION.md
- **Architecture**: See ARCHITECTURE.md
- **Email Syntax**: See /email-import-help endpoint
- **Status**: Check /api/status endpoint
- **Version**: Check /api/version endpoint

---

## Implementation Checklist

- [ ] Create URLSession with proper configuration
- [ ] Implement TickedifyAuthManager
- [ ] Add login/logout flow
- [ ] Implement task CRUD operations
- [ ] Add daily planning support
- [ ] Implement file upload/download
- [ ] Add offline queue support
- [ ] Implement error handling
- [ ] Add unit tests
- [ ] Test SSL pinning
- [ ] Implement date handling
- [ ] Add caching layer
- [ ] Test with real data
- [ ] Implement pagination
- [ ] Add analytics tracking

