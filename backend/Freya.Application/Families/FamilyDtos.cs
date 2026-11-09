namespace Freya.Application.Families;

public record FamilyDto(Guid Id, string Name, int InviteCode, int MemberCount, bool IsOwner);
public record FamilyMemberDto(string UserId, string DisplayName, string? AvatarUrl);
public record CreateFamilyRequest(string Name);
public record JoinFamilyRequest(int InviteCode);
public record PlanningSnapshotRequest(string ObjectivesJson, string RoomsJson, string TasksJson);
public record FamilyEventDto(
    Guid Id,
    string UserId,
    string OwnerName,
    bool Mine,
    string Title,
    DateOnly Date,
    DateOnly? EndDate,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    bool AllDay,
    int Kind,
    int Category);
public record FamilyPlanItemDto(
    string Id,
    string UserId,
    string OwnerName,
    bool Mine,
    string Title,
    string Meta,
    bool Done,
    string Kind,
    string? RoomId);
public record FamilyTodayDto(
    Guid FamilyId,
    string FamilyName,
    IReadOnlyList<FamilyMemberDto> Members,
    IReadOnlyList<FamilyEventDto> Events,
    IReadOnlyList<FamilyPlanItemDto> Objectives,
    IReadOnlyList<FamilyPlanItemDto> Habits,
    IReadOnlyList<FamilyPlanItemDto> Tasks);
