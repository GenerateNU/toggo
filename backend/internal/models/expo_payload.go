package models

type ExpoBuildWebhook struct {
	ID                  string          `json:"id"`
	AccountName         string          `json:"accountName"`
	ProjectName         string          `json:"projectName"`
	Platform            string          `json:"platform"`
	Status              string          `json:"status"`
	AppID               string          `json:"appId"`
	CreatedAt           string          `json:"createdAt"`
	CompletedAt         *string         `json:"completedAt,omitempty"`
	BuildDetailsPageURL string          `json:"buildDetailsPageUrl"`
	Artifacts           *ExpoArtifacts  `json:"artifacts,omitempty"`
	Error               *ExpoBuildError `json:"error,omitempty"`
	Metadata            *ExpoBuildMeta  `json:"metadata,omitempty"`
}

type ExpoArtifacts struct {
	BuildURL        *string `json:"buildUrl,omitempty"`
	LogsS3KeyPrefix string  `json:"logsS3KeyPrefix"`
}

type ExpoBuildError struct {
	Message   string `json:"message"`
	ErrorCode string `json:"errorCode"`
}

type ExpoBuildMeta struct {
	AppName        string `json:"appName"`
	AppVersion     string `json:"appVersion"`
	BuildProfile   string `json:"buildProfile"`
	AppIdentifier  string `json:"appIdentifier"`
	GitCommitHash  string `json:"gitCommitHash"`
	Message        string `json:"message"`
	RuntimeVersion string `json:"runtimeVersion"`
	Distribution   string `json:"distribution"`
}

type ExpoSubmissionWebhook struct {
	ID                   string              `json:"id"`
	AccountName          string              `json:"accountName"`
	ProjectName          string              `json:"projectName"`
	SubmissionDetailsURL string              `json:"submissionDetailsPageUrl"`
	ParentSubmissionID   *string             `json:"parentSubmissionId,omitempty"`
	AppID                string              `json:"appId"`
	ArchiveURL           string              `json:"archiveUrl"`
	InitiatingUserID     string              `json:"initiatingUserId"`
	CancelingUserID      *string             `json:"cancelingUserId,omitempty"`
	TurtleBuildID        *string             `json:"turtleBuildId,omitempty"`
	Platform             string              `json:"platform"`
	Status               string              `json:"status"`
	SubmissionInfo       *ExpoSubmissionInfo `json:"submissionInfo,omitempty"`
	CreatedAt            string              `json:"createdAt"`
	UpdatedAt            string              `json:"updatedAt"`
	CompletedAt          *string             `json:"completedAt,omitempty"`
	MaxRetryTimeMinutes  int                 `json:"maxRetryTimeMinutes"`
}

type ExpoSubmissionInfo struct {
	Error   *ExpoSubmissionError `json:"error,omitempty"`
	LogsURL string               `json:"logsUrl"`
}

type ExpoSubmissionError struct {
	Message   string `json:"message"`
	ErrorCode string `json:"errorCode"`
}
