import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function ActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activities"],
  });

  const getActivityIcon = (action: string, entityType: string) => {
    if (action === "created") return "fas fa-plus";
    if (action === "updated") return "fas fa-edit";
    if (action === "deleted") return "fas fa-trash";
    if (action === "deployed") return "fas fa-upload";
    return "fas fa-info-circle";
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case "created":
        return "text-green-600 bg-green-100";
      case "updated":
        return "text-blue-600 bg-blue-100";
      case "deleted":
        return "text-red-600 bg-red-100";
      case "deployed":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-slate-600 bg-slate-100";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full mt-6 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-clock text-slate-400 text-3xl mb-4"></i>
            <p className="text-slate-600 font-medium">No recent activity</p>
            <p className="text-sm text-slate-500 mt-1">Activity will appear here as you make changes</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 ${getActivityColor(activity.action)}`}>
                    <i className={`${getActivityIcon(activity.action, activity.entityType)} text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      {activity.user && (
                        <span className="ml-1">
                          by {activity.user.firstName && activity.user.lastName 
                            ? `${activity.user.firstName} ${activity.user.lastName}`
                            : activity.user.email
                          }
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-6">
              View All Activity
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
