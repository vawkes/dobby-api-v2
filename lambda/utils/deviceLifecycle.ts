export const ASSIGNMENT_STATUSES = [
    'PENDING_INSTALL',
    'ACTIVE',
    'INACTIVE',
    'MAINTENANCE',
    'OFFLINE',
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const resolveEffectiveAssignmentStatus = (
    assignmentStatus?: AssignmentStatus,
    updatedAt?: string,
): AssignmentStatus => {
    if (!assignmentStatus) return 'ACTIVE';
    if (assignmentStatus === 'PENDING_INSTALL' && updatedAt) return 'ACTIVE';
    return assignmentStatus;
};

export const buildPendingInstallDevice = (deviceId: string, assignmentStatus?: AssignmentStatus) => ({
    device_id: deviceId,
    assignment_status: assignmentStatus,
    effective_assignment_status: resolveEffectiveAssignmentStatus(assignmentStatus),
});
