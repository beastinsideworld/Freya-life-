namespace Freya.Application.Budget;

public record BudgetAllocationDto(Guid Id, string Label, string Kind, decimal PlannedAmount);
public record BudgetMovementDto(Guid Id, string Label, string Kind, decimal Amount, DateOnly Date, string? Note);
public record BudgetMonthDto(
    Guid Id,
    int Year,
    int Month,
    decimal Salary,
    string? Note,
    IReadOnlyList<BudgetAllocationDto> Allocations,
    IReadOnlyList<BudgetMovementDto> Movements,
    bool CanEdit,
    string OwnerName,
    string OwnerUserId);
public record UpsertBudgetMonthRequest(
    int Year,
    int Month,
    decimal Salary,
    string? Note,
    IReadOnlyList<UpsertAllocationRequest> Allocations,
    IReadOnlyList<UpsertMovementRequest> Movements);
public record UpsertAllocationRequest(Guid? Id, string Label, string Kind, decimal PlannedAmount);
public record UpsertMovementRequest(Guid? Id, string Label, string Kind, decimal Amount, DateOnly Date, string? Note);
public record BudgetShareDto(
    string ViewerUserId,
    string ViewerName,
    bool ShareSalary,
    bool ShareAllocations,
    bool ShareSavings,
    bool ShareMovements);
public record UpsertBudgetShareRequest(
    string ViewerUserId,
    bool ShareSalary,
    bool ShareAllocations,
    bool ShareSavings,
    bool ShareMovements);
public record SharedBudgetOwnerDto(string UserId, string DisplayName, string? AvatarUrl);
